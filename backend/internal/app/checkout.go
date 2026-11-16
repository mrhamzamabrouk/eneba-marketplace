package app

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type CartItem struct {
	OfferID       int `json:"offer_id"`
	Quantity      int `json:"quantity"`
	ExpectedPrice int `json:"expected_price_cents"`
}
type CheckoutRequest struct {
	Items   []CartItem `json:"items"`
	Payment string     `json:"payment"`
}
type OrderItem struct {
	Title    string `json:"title"`
	Seller   string `json:"seller"`
	Platform string `json:"platform"`
	Region   string `json:"region"`
	Price    int    `json:"unit_cents"`
	Key      string `json:"key"`
	OfferID  int    `json:"offer_id"`
}
type Order struct {
	ID        string      `json:"id"`
	Total     int         `json:"total_cents"`
	Currency  string      `json:"currency"`
	CreatedAt time.Time   `json:"created_at"`
	Items     []OrderItem `json:"items"`
}

func normalize(req *CheckoutRequest) bool {
	if len(req.Items) < 1 || len(req.Items) > 20 || !contains([]string{"success", "failure"}, req.Payment) {
		return false
	}
	sort.Slice(req.Items, func(i, j int) bool { return req.Items[i].OfferID < req.Items[j].OfferID })
	units := 0
	for i, item := range req.Items {
		if item.OfferID <= 0 || item.Quantity < 1 || item.Quantity > 5 || item.ExpectedPrice < 1 || item.ExpectedPrice > 1000000 || (i > 0 && req.Items[i-1].OfferID == item.OfferID) {
			return false
		}
		units += item.Quantity
	}
	return units <= 50
}
func (a *App) checkout(w http.ResponseWriter, r *http.Request) {
	var req CheckoutRequest
	if !decode(w, r, &req) {
		return
	}
	token := r.Header.Get("Idempotency-Key")
	if !normalize(&req) || len(token) < 16 || len(token) > 128 || strings.ContainsAny(token, "\r\n\x00") {
		fail(w, 400, "Use a valid cart and an idempotency key of 16–128 characters.")
		return
	}
	body, _ := json.Marshal(req)
	h := sha256.Sum256(body)
	fingerprint := hex.EncodeToString(h[:])
	u := r.Context().Value(userContextKey{}).(User)
	// Retain the first request fingerprint even when payment/stock validation fails.
	// This record is not an order and allocates no keys. A changed request needs a new token.
	_, e := a.DB.Exec(r.Context(), `INSERT INTO checkout_idempotency(user_id,token,fingerprint) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, u.ID, token, fingerprint)
	if e != nil {
		serverError(w, e)
		return
	}
	tx, e := a.DB.Begin(r.Context())
	if e != nil {
		serverError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var stored string
	var prior *string
	e = tx.QueryRow(r.Context(), `SELECT fingerprint,order_id FROM checkout_idempotency WHERE user_id=$1 AND token=$2 FOR UPDATE`, u.ID, token).Scan(&stored, &prior)
	if e != nil {
		serverError(w, e)
		return
	}
	if stored != fingerprint {
		fail(w, 409, "This checkout reference was used with different contents. Start a new checkout.")
		return
	}
	if prior != nil {
		_ = tx.Rollback(r.Context())
		o, e := a.loadOrder(r, *prior, u.ID)
		if e != nil {
			serverError(w, e)
			return
		}
		write(w, 200, o)
		return
	}
	if req.Payment == "failure" {
		fail(w, 402, "Simulated payment declined. No order or keys were created.")
		return
	}
	type purchase struct {
		item                            CartItem
		title, seller, platform, region string
		price                           int
		keys                            []int64
	}
	purchases := []purchase{}
	total := 0
	changes := []CartItem{}
	// All checkouts lock offer rows in ascending order, preventing overselling and lock cycles.
	for _, item := range req.Items {
		p := purchase{item: item}
		e = tx.QueryRow(r.Context(), `SELECT p.title,s.name,o.platform,o.region,o.price_cents FROM offers o JOIN products p ON p.id=o.product_id JOIN sellers s ON s.id=o.seller_id WHERE o.id=$1 FOR UPDATE OF o`, item.OfferID).Scan(&p.title, &p.seller, &p.platform, &p.region, &p.price)
		if e == pgx.ErrNoRows {
			fail(w, 409, "An offer is no longer available. Update your cart.")
			return
		}
		if e != nil {
			serverError(w, e)
			return
		}
		if item.ExpectedPrice != p.price {
			changes = append(changes, CartItem{item.OfferID, item.Quantity, p.price})
		}
		rows, e := tx.Query(r.Context(), `SELECT id FROM key_inventory WHERE offer_id=$1 AND sold_order IS NULL ORDER BY id LIMIT $2 FOR UPDATE`, item.OfferID, item.Quantity)
		if e != nil {
			serverError(w, e)
			return
		}
		for rows.Next() {
			var id int64
			if e = rows.Scan(&id); e != nil {
				rows.Close()
				serverError(w, e)
				return
			}
			p.keys = append(p.keys, id)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			serverError(w, e)
			return
		}
		if len(p.keys) < item.Quantity {
			fail(w, 409, "There are not enough keys for an offer. Reduce its quantity or choose another seller.")
			return
		}
		total += p.price * item.Quantity
		purchases = append(purchases, p)
	}
	if len(changes) > 0 {
		write(w, 409, map[string]any{"error": "Prices changed. Review and accept the new prices before paying again.", "code": "PRICE_CHANGED", "prices": changes})
		return
	}
	id := randomToken()
	_, e = tx.Exec(r.Context(), `INSERT INTO orders(id,user_id,total_cents) VALUES($1,$2,$3)`, id, u.ID, total)
	if e != nil {
		serverError(w, e)
		return
	}
	for _, p := range purchases {
		for _, keyID := range p.keys {
			tag, e := tx.Exec(r.Context(), `UPDATE key_inventory SET sold_order=$1 WHERE id=$2 AND sold_order IS NULL`, id, keyID)
			if e != nil {
				serverError(w, e)
				return
			}
			if tag.RowsAffected() != 1 {
				fail(w, 409, "Stock changed. Please try again.")
				return
			}
			_, e = tx.Exec(r.Context(), `INSERT INTO order_items(order_id,inventory_id,offer_id,title,seller,platform,region,unit_cents) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, keyID, p.item.OfferID, p.title, p.seller, p.platform, p.region, p.price)
			if e != nil {
				serverError(w, e)
				return
			}
		}
	}
	_, e = tx.Exec(r.Context(), `UPDATE checkout_idempotency SET order_id=$1 WHERE user_id=$2 AND token=$3`, id, u.ID, token)
	if e != nil {
		serverError(w, e)
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		serverError(w, e)
		return
	}
	o, e := a.loadOrder(r, id, u.ID)
	if e != nil {
		serverError(w, e)
		return
	}
	write(w, 201, o)
}
func (a *App) loadOrder(r *http.Request, id, userID string) (Order, error) {
	var o Order
	e := a.DB.QueryRow(r.Context(), `SELECT id,total_cents,currency,created_at FROM orders WHERE id=$1 AND user_id=$2`, id, userID).Scan(&o.ID, &o.Total, &o.Currency, &o.CreatedAt)
	if e != nil {
		return o, e
	}
	o.Items = []OrderItem{}
	rows, e := a.DB.Query(r.Context(), `SELECT i.title,i.seller,i.platform,i.region,i.unit_cents,k.fake_key,i.offer_id FROM order_items i JOIN key_inventory k ON k.id=i.inventory_id WHERE i.order_id=$1 ORDER BY i.id`, id)
	if e != nil {
		return o, e
	}
	defer rows.Close()
	for rows.Next() {
		var item OrderItem
		if e = rows.Scan(&item.Title, &item.Seller, &item.Platform, &item.Region, &item.Price, &item.Key, &item.OfferID); e != nil {
			return o, e
		}
		o.Items = append(o.Items, item)
	}
	return o, rows.Err()
}
func (a *App) order(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userContextKey{}).(User)
	o, e := a.loadOrder(r, chi.URLParam(r, "id"), u.ID)
	if e == pgx.ErrNoRows {
		fail(w, 404, "Order not found.")
		return
	}
	if e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, o)
}
func (a *App) orders(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userContextKey{}).(User)
	out := []Order{}
	rows, e := a.DB.Query(r.Context(), `SELECT id,total_cents,currency,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, u.ID)
	if e != nil {
		serverError(w, e)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var o Order
		if e = rows.Scan(&o.ID, &o.Total, &o.Currency, &o.CreatedAt); e != nil {
			serverError(w, e)
			return
		}
		out = append(out, o)
	}
	if e = rows.Err(); e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, out)
}
