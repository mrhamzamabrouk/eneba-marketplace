package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}
type userContextKey struct{}

func randomToken() string {
	b := make([]byte, 32)
	if _, e := rand.Read(b); e != nil {
		panic("random source unavailable")
	}
	return hex.EncodeToString(b)
}

type attempt struct {
	count int
	until time.Time
}
type limiter struct {
	mu      sync.Mutex
	entries map[string]attempt
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if l.entries == nil {
		l.entries = map[string]attempt{}
	}
	for k, v := range l.entries {
		if now.After(v.until) {
			delete(l.entries, k)
		}
	}
	if len(l.entries) >= 10000 {
		return false
	}
	v := l.entries[key]
	if v.count == 0 {
		v.until = now.Add(10 * time.Minute)
	}
	v.count++
	l.entries[key] = v
	return v.count <= 20
}
func (a *App) authAllowed(w http.ResponseWriter, r *http.Request) bool {
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if !a.throttle.allow(ip) {
		w.Header().Set("Retry-After", "600")
		fail(w, 429, "Too many attempts. Try again in ten minutes.")
		return false
	}
	return true
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func credentialsValid(c *credentials) bool {
	c.Email = strings.ToLower(strings.TrimSpace(c.Email))
	addr, e := mail.ParseAddress(c.Email)
	return e == nil && addr.Address == c.Email && len(c.Email) <= 254 && len(c.Password) >= 10 && len(c.Password) <= 72
}
func (a *App) setSession(w http.ResponseWriter, r *http.Request, u User) error {
	token := randomToken()
	hash := sha256.Sum256([]byte(token))
	// Remove old and expired records. Never log opaque tokens or credentials.
	_, e := a.DB.Exec(r.Context(), `DELETE FROM sessions WHERE expires_at < now()`)
	if e != nil {
		return e
	}
	if old, e := r.Cookie("session"); e == nil {
		oldHash := sha256.Sum256([]byte(old.Value))
		_, e = a.DB.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash=$1`, oldHash[:])
		if e != nil {
			return e
		}
	}
	_, e = a.DB.Exec(r.Context(), `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')`, hash[:], u.ID)
	if e != nil {
		return e
	}
	http.SetCookie(w, &http.Cookie{Name: "session", Value: token, Path: "/", HttpOnly: true, Secure: a.Config.Secure, SameSite: http.SameSiteLaxMode, MaxAge: 7 * 24 * 3600})
	return nil
}
func (a *App) register(w http.ResponseWriter, r *http.Request) {
	if !a.authAllowed(w, r) {
		return
	}
	var c credentials
	if !decode(w, r, &c) {
		return
	}
	if !credentialsValid(&c) {
		fail(w, 400, "Use a valid email and a password of 10–72 UTF-8 bytes.")
		return
	}
	hash, e := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if e != nil {
		serverError(w, e)
		return
	}
	u := User{randomToken(), c.Email}
	_, e = a.DB.Exec(r.Context(), `INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)`, u.ID, u.Email, string(hash))
	if e != nil {
		if p, ok := e.(*pgconn.PgError); ok && p.Code == "23505" {
			fail(w, 409, "That email is already registered. Sign in instead.")
			return
		}
		serverError(w, e)
		return
	}
	if e = a.setSession(w, r, u); e != nil {
		serverError(w, e)
		return
	}
	write(w, 201, u)
}

var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("unused-password-constant"), bcrypt.DefaultCost)

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	if !a.authAllowed(w, r) {
		return
	}
	var c credentials
	if !decode(w, r, &c) {
		return
	}
	if !credentialsValid(&c) {
		fail(w, 401, "Email or password is incorrect.")
		return
	}
	var u User
	var hash string
	e := a.DB.QueryRow(r.Context(), `SELECT id,email,password_hash FROM users WHERE email=$1`, c.Email).Scan(&u.ID, &u.Email, &hash)
	if e != nil && e != pgx.ErrNoRows {
		serverError(w, e)
		return
	}
	if e == pgx.ErrNoRows {
		hash = string(dummyHash)
	}
	match := bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password))
	if e != nil || match != nil {
		fail(w, 401, "Email or password is incorrect.")
		return
	}
	if e = a.setSession(w, r, u); e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, u)
}
func (a *App) currentUser(r *http.Request) (User, error) {
	var u User
	c, e := r.Cookie("session")
	if e != nil || len(c.Value) != 64 {
		return u, pgx.ErrNoRows
	}
	h := sha256.Sum256([]byte(c.Value))
	e = a.DB.QueryRow(r.Context(), `SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`, h[:]).Scan(&u.ID, &u.Email)
	return u, e
}
func (a *App) me(w http.ResponseWriter, r *http.Request) {
	u, e := a.currentUser(r)
	if e != nil {
		if e != pgx.ErrNoRows {
			serverError(w, e)
			return
		}
		fail(w, 401, "Please sign in.")
		return
	}
	write(w, 200, u)
}
func (a *App) requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, e := a.currentUser(r)
		if e != nil {
			if e != pgx.ErrNoRows {
				serverError(w, e)
				return
			}
			fail(w, 401, "Please sign in to continue.")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, u)))
	})
}
func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	if c, e := r.Cookie("session"); e == nil {
		h := sha256.Sum256([]byte(c.Value))
		if _, e = a.DB.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash=$1`, h[:]); e != nil {
			serverError(w, e)
			return
		}
	}
	http.SetCookie(w, &http.Cookie{Name: "session", Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: a.Config.Secure, SameSite: http.SameSiteLaxMode})
	write(w, 200, map[string]bool{"ok": true})
}
