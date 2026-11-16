package app

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func fail(w http.ResponseWriter, status int, msg string) {
	write(w, status, map[string]string{"error": msg})
}
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		fail(w, 415, "Send application/json.")
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		fail(w, 400, "Invalid or oversized JSON request.")
		return false
	}
	if err := d.Decode(new(any)); !errors.Is(err, io.EOF) {
		fail(w, 400, "Send one JSON object.")
		return false
	}
	return true
}
func serverError(w http.ResponseWriter, err error) {
	log.Print("database operation failed")
	fail(w, 500, "Something went wrong. Please try again.")
}
func (a *App) Router(public fs.FS) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.CleanPath)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "same-origin")
			w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
			if strings.HasPrefix(r.URL.Path, "/api") {
				w.Header().Set("Cache-Control", "no-store")
			}
			if r.Method != "GET" && r.Method != "HEAD" && r.Method != "OPTIONS" && r.Header.Get("Origin") != a.Config.Origin {
				fail(w, 403, "Request origin is not allowed.")
				return
			}
			next.ServeHTTP(w, r)
		})
	})
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) { write(w, 200, map[string]string{"status": "ok"}) })
	r.Get("/api/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := a.DB.Ping(r.Context()); err != nil {
			fail(w, 503, "Database unavailable")
			return
		}
		write(w, 200, map[string]string{"status": "ready"})
	})
	r.Get("/api/products", a.catalog)
	r.Get("/api/products/{slug}", a.product)
	r.Get("/api/search", a.suggestions)
	r.Get("/api/home/banner", a.banner)
	r.Get("/api/home/best-sellers", a.bestSellers)
	r.Get("/api/home/deals", a.deals)
	r.Post("/api/auth/register", a.register)
	r.Post("/api/auth/login", a.login)
	r.Post("/api/auth/logout", a.logout)
	r.Get("/api/auth/me", a.me)
	r.Group(func(r chi.Router) {
		r.Use(a.requireUser)
		r.Post("/api/checkout", a.checkout)
		r.Get("/api/orders", a.orders)
		r.Get("/api/orders/{id}", a.order)
	})
	r.HandleFunc("/api/*", func(w http.ResponseWriter, r *http.Request) { fail(w, 404, "API endpoint not found.") })
	r.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) { fail(w, 404, "API endpoint not found.") })
	files := http.FileServer(http.FS(public))
	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		clean := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if info, e := fs.Stat(public, clean); e == nil && !info.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		if path.Ext(clean) != "" {
			http.NotFound(w, r)
			return
		}
		data, e := fs.ReadFile(public, "index.html")
		if e != nil {
			http.Error(w, "Frontend build missing", 503)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(data)
	})
	return r
}
