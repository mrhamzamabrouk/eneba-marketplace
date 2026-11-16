package app

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"testing/fstest"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Each test owns a schema in an explicitly named *_test database. No production URL is used.
func fixture(t *testing.T) (*App, *httptest.Server) {
	t.Helper()
	raw := os.Getenv("TEST_DATABASE_URL")
	if raw == "" {
		t.Skip("TEST_DATABASE_URL missing; integration tests not run")
	}
	u, e := url.Parse(raw)
	if e != nil || !strings.HasSuffix(strings.TrimPrefix(u.Path, "/"), "_test") {
		t.Fatal("integration tests require a dedicated database ending in _test")
	}
	ctx := context.Background()
	admin, e := pgxpool.New(ctx, raw)
	if e != nil {
		t.Fatal(e)
	}
	schema := "test_" + randomToken()[:16]
	if _, e = admin.Exec(ctx, "CREATE SCHEMA "+schema); e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { _, _ = admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE"); admin.Close() })
	q := u.Query()
	q.Set("search_path", schema+",public")
	u.RawQuery = q.Encode()
	a, e := Open(ctx, Config{DatabaseURL: u.String(), Origin: "http://test.local"})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(a.Close)
	if e = a.Seed(ctx); e != nil {
		t.Fatal(e)
	}
	s := httptest.NewServer(a.Router(fstest.MapFS{"index.html": {Data: []byte("<html>test app</html>")}}))
	t.Cleanup(s.Close)
	return a, s
}

type result struct {
	status  int
	body    []byte
	cookies []*http.Cookie
}

func request(s *httptest.Server, method, path string, body any, cookie *http.Cookie, key string) result {
	var reader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reader = bytes.NewReader(b)
	}
	r, _ := http.NewRequest(method, s.URL+path, reader)
	r.Header.Set("Origin", "http://test.local")
	r.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		r.AddCookie(cookie)
	}
	if key != "" {
		r.Header.Set("Idempotency-Key", key)
	}
	resp, e := s.Client().Do(r)
	if e != nil {
		return result{status: 0, body: []byte(e.Error())}
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return result{resp.StatusCode, b, resp.Cookies()}
}
func signup(t *testing.T, s *httptest.Server, email string) (User, *http.Cookie) {
	t.Helper()
	r := request(s, "POST", "/api/auth/register", credentials{email, "test-password-123"}, nil, "")
	if r.status != 201 {
		t.Fatalf("signup %d: %s", r.status, r.body)
	}
	var u User
	_ = json.Unmarshal(r.body, &u)
	if len(r.cookies) != 1 {
		t.Fatal("session cookie missing")
	}
	return u, r.cookies[0]
}
func expect(t *testing.T, r result, status int) {
	t.Helper()
	if r.status != status {
		t.Fatalf("expected %d got %d: %s", status, r.status, r.body)
	}
}
func count(t *testing.T, a *App, query string) int {
	t.Helper()
	var n int
	if e := a.DB.QueryRow(context.Background(), query).Scan(&n); e != nil {
		t.Fatal(e)
	}
	return n
}

func TestIntegrationCatalogAndIndependentHome(t *testing.T) {
	a, s := fixture(t)
	ctx := context.Background()
	for _, mode := range []string{"trigram", "fallback"} {
		a.Config.SearchMode = mode
		for _, query := range []string{"Eldn%20Ring", "cyber"} {
			r := request(s, "GET", "/api/products?q="+query, nil, nil, "")
			expect(t, r, 200)
			var out Catalog
			_ = json.Unmarshal(r.body, &out)
			if len(out.Items) == 0 {
				t.Fatalf("%s search failed for %s: %s", mode, query, r.body)
			}
			want := "Elden Ring"
			if query == "cyber" {
				want = "Cyberpunk 2077"
			}
			if out.Items[0].Title != want {
				t.Fatalf("ranking %s: %+v", mode, out)
			}
		}
	}
	r := request(s, "GET", "/api/products?platform=Steam&region=Europe&min=100&max=4000&sort=price_desc&page_size=4", nil, nil, "")
	expect(t, r, 200)
	var out Catalog
	_ = json.Unmarshal(r.body, &out)
	if len(out.Items) != 4 {
		t.Fatal("combined filters/pagination", string(r.body))
	}
	last := 1000000
	for _, p := range out.Items {
		if p.Price > last {
			t.Fatal("wrong price order")
		}
		last = p.Price
		for _, o := range p.Offers {
			if o.Platform != "Steam" || o.Region != "Europe" || o.Price < 100 || o.Price > 4000 || o.Stock < 1 {
				t.Fatalf("ineligible offer %+v", o)
			}
		}
	}
	for _, path := range []string{"/api/home/best-sellers", "/api/home/deals", "/api/products/elden-ring"} {
		r = request(s, "GET", path, nil, nil, "")
		expect(t, r, 200)
		if bytes.Contains(r.body, []byte("fake_key")) || bytes.Contains(r.body, []byte("NOT-A-REAL-KEY")) {
			t.Fatal("catalog leaked inventory")
		}
	}
	_, e := a.DB.Exec(ctx, `UPDATE homepage_content SET title='Database edit is visible' WHERE id=1`)
	if e != nil {
		t.Fatal(e)
	}
	r = request(s, "GET", "/api/home/banner", nil, nil, "")
	if !bytes.Contains(r.body, []byte("Database edit is visible")) {
		t.Fatal("homepage not driven by database")
	}
	if e = a.Seed(ctx); e != nil {
		t.Fatal(e)
	}
	r = request(s, "GET", "/api/home/banner", nil, nil, "")
	if !bytes.Contains(r.body, []byte("Database edit is visible")) {
		t.Fatal("seed overwrote content")
	}
	expect(t, request(s, "GET", "/api/products?q="+strings.Repeat("a", 81), nil, nil, ""), 400)
	expect(t, request(s, "GET", "/api/missing", nil, nil, ""), 404)
	expect(t, request(s, "GET", "/store/nested", nil, nil, ""), 200)
	expect(t, request(s, "GET", "/missing.js", nil, nil, ""), 404)
}
func TestIntegrationCheckoutFailurePriceOwnershipAndReplay(t *testing.T) {
	a, s := fixture(t)
	u, c := signup(t, s, "first@example.com")
	_, second := signup(t, s, "second@example.com")
	req := CheckoutRequest{[]CartItem{{11, 2, 799}}, "failure"}
	expect(t, request(s, "POST", "/api/checkout", req, nil, randomToken()), 401)
	failedToken := randomToken()
	expect(t, request(s, "POST", "/api/checkout", req, c, failedToken), 402)
	expect(t, request(s, "POST", "/api/checkout", req, c, failedToken), 402)
	if count(t, a, "SELECT count(*) FROM orders") != 0 || count(t, a, "SELECT count(*) FROM key_inventory WHERE sold_order IS NOT NULL") != 0 {
		t.Fatal("payment failure consumed data")
	}
	req.Payment = "success"
	expect(t, request(s, "POST", "/api/checkout", req, c, failedToken), 409)
	req.Items[0].ExpectedPrice = 1
	price := request(s, "POST", "/api/checkout", req, c, randomToken())
	expect(t, price, 409)
	if !bytes.Contains(price.body, []byte("PRICE_CHANGED")) {
		t.Fatal("missing reconfirmation details")
	}
	if count(t, a, "SELECT count(*) FROM orders") != 0 {
		t.Fatal("price mismatch created order")
	}
	req.Items[0].ExpectedPrice = 799
	token := randomToken()
	r := request(s, "POST", "/api/checkout", req, c, token)
	expect(t, r, 201)
	var order Order
	_ = json.Unmarshal(r.body, &order)
	if order.Total != 1598 || len(order.Items) != 2 || order.Items[0].Seller != "Pixel Harbor" || order.Items[0].Key == order.Items[1].Key {
		t.Fatalf("wrong snapshots/keys %+v", order)
	}
	expect(t, request(s, "POST", "/api/checkout", req, c, token), 200)
	if count(t, a, "SELECT count(*) FROM orders") != 1 || count(t, a, "SELECT count(*) FROM key_inventory WHERE sold_order IS NOT NULL") != 2 {
		t.Fatal("replay consumed more keys")
	}
	req.Items[0].Quantity = 1
	expect(t, request(s, "POST", "/api/checkout", req, c, token), 409)
	expect(t, request(s, "GET", "/api/orders/"+order.ID, nil, second, ""), 404)
	expect(t, request(s, "GET", "/api/orders/"+order.ID, nil, nil, ""), 401)
	expect(t, request(s, "GET", "/api/orders/"+order.ID, nil, c, ""), 200)
	if e := a.Seed(context.Background()); e != nil {
		t.Fatal(e)
	}
	if count(t, a, "SELECT count(*) FROM key_inventory WHERE sold_order IS NOT NULL") != 2 {
		t.Fatal("seed reset purchased inventory")
	}
	// Reopen with the same database configuration: orders and keys survive process lifetimes.
	reopened, e := Open(context.Background(), a.Config)
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	var total int
	e = reopened.DB.QueryRow(context.Background(), `SELECT total_cents FROM orders WHERE id=$1 AND user_id=$2`, order.ID, u.ID).Scan(&total)
	if e != nil || total != 1598 {
		t.Fatal("restart persistence failed", e)
	}
}
func TestIntegrationIdempotencyIsScopedToUser(t *testing.T) {
	a, s := fixture(t)
	_, c1 := signup(t, s, "scope1@example.com")
	_, c2 := signup(t, s, "scope2@example.com")
	token := randomToken()
	req := CheckoutRequest{[]CartItem{{11, 1, 799}}, "success"}
	first := request(s, "POST", "/api/checkout", req, c1, token)
	expect(t, first, 201)
	second := request(s, "POST", "/api/checkout", req, c2, token)
	expect(t, second, 201)
	var one, two Order
	_ = json.Unmarshal(first.body, &one)
	_ = json.Unmarshal(second.body, &two)
	if one.ID == two.ID || one.Items[0].Key == two.Items[0].Key || count(t, a, "SELECT count(*) FROM orders") != 2 {
		t.Fatal("idempotency leaked across users")
	}
}
func TestIntegrationLastKeyContention(t *testing.T) {
	a, s := fixture(t)
	_, c1 := signup(t, s, "race1@example.com")
	_, c2 := signup(t, s, "race2@example.com")
	_, e := a.DB.Exec(context.Background(), `DELETE FROM key_inventory WHERE offer_id=11 AND id NOT IN (SELECT min(id) FROM key_inventory WHERE offer_id=11)`)
	if e != nil {
		t.Fatal(e)
	}
	req := CheckoutRequest{[]CartItem{{11, 1, 799}}, "success"}
	start := make(chan struct{})
	results := make(chan result, 2)
	var wg sync.WaitGroup
	for _, c := range []*http.Cookie{c1, c2} {
		wg.Add(1)
		go func(cookie *http.Cookie) {
			defer wg.Done()
			<-start
			results <- request(s, "POST", "/api/checkout", req, cookie, randomToken())
		}(c)
	}
	close(start)
	wg.Wait()
	close(results)
	statuses := map[int]int{}
	for r := range results {
		statuses[r.status]++
	}
	if statuses[201] != 1 || statuses[409] != 1 {
		t.Fatalf("contention results %v", statuses)
	}
	if count(t, a, "SELECT count(*) FROM orders") != 1 || count(t, a, "SELECT count(*) FROM order_items") != 1 {
		t.Fatal("oversold last key")
	}
}
func TestIntegrationConcurrentIdempotencyAndRollback(t *testing.T) {
	a, s := fixture(t)
	_, c := signup(t, s, "retry@example.com")
	req := CheckoutRequest{[]CartItem{{11, 1, 799}}, "success"}
	token := randomToken()
	start := make(chan struct{})
	results := make(chan result, 8)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); <-start; results <- request(s, "POST", "/api/checkout", req, c, token) }()
	}
	close(start)
	wg.Wait()
	close(results)
	id := ""
	for r := range results {
		if r.status != 200 && r.status != 201 {
			t.Fatalf("retry failed %d %s", r.status, r.body)
		}
		var order Order
		_ = json.Unmarshal(r.body, &order)
		if id != "" && id != order.ID {
			t.Fatal("multiple orders for one key")
		}
		id = order.ID
	}
	if count(t, a, "SELECT count(*) FROM orders") != 1 {
		t.Fatal("duplicate orders")
	}
	_, e := a.DB.Exec(context.Background(), `DELETE FROM key_inventory WHERE offer_id=12`)
	if e != nil {
		t.Fatal(e)
	}
	req.Items = []CartItem{{11, 1, 799}, {12, 1, 1029}}
	expect(t, request(s, "POST", "/api/checkout", req, c, randomToken()), 409)
	if count(t, a, "SELECT count(*) FROM key_inventory WHERE sold_order IS NOT NULL") != 1 {
		t.Fatal("partial cart consumed inventory")
	}
}
func TestIntegrationSessionsAndOrigin(t *testing.T) {
	a, s := fixture(t)
	u, c := signup(t, s, "auth@example.com")
	if !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.MaxAge != 604800 {
		t.Fatalf("unsafe cookie %+v", c)
	}
	expect(t, request(s, "GET", "/api/auth/me", nil, c, ""), 200)
	var hash string
	if e := a.DB.QueryRow(context.Background(), `SELECT password_hash FROM users WHERE id=$1`, u.ID).Scan(&hash); e != nil || !strings.HasPrefix(hash, "$2") {
		t.Fatal("password not bcrypt hashed")
	}
	sum := sha256.Sum256([]byte(c.Value))
	var found int
	if e := a.DB.QueryRow(context.Background(), `SELECT count(*) FROM sessions WHERE token_hash=$1`, sum[:]).Scan(&found); e != nil || found != 1 {
		t.Fatal("session is not stored by token hash")
	}
	raw, _ := http.NewRequest("POST", s.URL+"/api/auth/logout", strings.NewReader("{}"))
	raw.AddCookie(c)
	raw.Header.Set("Origin", "https://attacker.invalid")
	resp, e := s.Client().Do(raw)
	if e != nil {
		t.Fatal(e)
	}
	resp.Body.Close()
	if resp.StatusCode != 403 {
		t.Fatal("foreign origin allowed")
	}
	expect(t, request(s, "POST", "/api/auth/logout", map[string]any{}, c, ""), 200)
	expect(t, request(s, "GET", "/api/auth/me", nil, c, ""), 401)
	login := request(s, "POST", "/api/auth/login", credentials{"auth@example.com", "test-password-123"}, nil, "")
	expect(t, login, 200)
	c = login.cookies[0]
	_, e = a.DB.Exec(context.Background(), `UPDATE sessions SET expires_at=now()-interval '1 second'`)
	if e != nil {
		t.Fatal(e)
	}
	expect(t, request(s, "GET", "/api/auth/me", nil, c, ""), 401)
	a.Config.Secure = true
	secure := request(s, "POST", "/api/auth/login", credentials{"auth@example.com", "test-password-123"}, nil, "")
	expect(t, secure, 200)
	if !secure.cookies[0].Secure {
		t.Fatal("production cookie missing Secure")
	}
	for i := 0; i < 21; i++ {
		r := request(s, "POST", "/api/auth/login", credentials{fmt.Sprintf("missing%d@example.com", i), "test-password-123"}, nil, "")
		if i == 20 && r.status != 429 {
			t.Fatal("login throttle absent")
		}
	}
}
func TestIntegrationWithoutTrigramExtension(t *testing.T) {
	a, _ := fixture(t)
	if _, e := a.DB.Exec(context.Background(), `DROP EXTENSION IF EXISTS pg_trgm CASCADE`); e != nil {
		t.Fatal(e)
	}
	reopened, e := Open(context.Background(), a.Config)
	if e != nil {
		t.Fatal(e)
	}
	defer reopened.Close()
	if reopened.Config.SearchMode != "fallback" {
		t.Fatal("missing extension did not select fallback")
	}
	s := httptest.NewServer(reopened.Router(fstest.MapFS{"index.html": {Data: []byte("test")}}))
	defer s.Close()
	r := request(s, "GET", "/api/products?q=Eldn%20Ring", nil, nil, "")
	expect(t, r, 200)
	var out Catalog
	_ = json.Unmarshal(r.body, &out)
	if len(out.Items) == 0 || out.Items[0].Title != "Elden Ring" {
		t.Fatal("fallback failed without extension", string(r.body))
	}
}
