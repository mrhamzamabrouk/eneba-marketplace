package app

import (
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type Offer struct {
	ID       int     `json:"id"`
	Seller   string  `json:"seller"`
	Rating   float64 `json:"rating"`
	Platform string  `json:"platform"`
	Region   string  `json:"region"`
	Price    int     `json:"price_cents"`
	Stock    int     `json:"stock"`
}
type Product struct {
	ID          int     `json:"id"`
	Slug        string  `json:"slug"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Image       string  `json:"image"`
	Genre       string  `json:"genre"`
	Popularity  int     `json:"popularity"`
	Discount    int     `json:"discount"`
	Price       int     `json:"price_cents"`
	Offers      []Offer `json:"offers"`
}
type Catalog struct {
	Items    []Product `json:"items"`
	Total    int       `json:"total"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
}
type filters struct {
	Q, Platform, Region, Sort string
	Min, Max, Page, Size      int
}

func parseFilters(v url.Values) (filters, error) {
	f := filters{Q: strings.ToLower(strings.TrimSpace(v.Get("q"))), Platform: v.Get("platform"), Region: v.Get("region"), Sort: v.Get("sort"), Max: 1000000, Page: 1, Size: 12}
	if len(f.Q) > 80 {
		return f, fmt.Errorf("Search must be 80 bytes or less.")
	}
	for key, dst := range map[string]*int{"min": &f.Min, "max": &f.Max, "page": &f.Page, "page_size": &f.Size} {
		if raw := v.Get(key); raw != "" {
			n, e := strconv.Atoi(raw)
			if e != nil || n < 0 || n > 1000000 {
				return f, fmt.Errorf("Invalid %s.", key)
			}
			*dst = n
		}
	}
	if f.Page < 1 || f.Size < 1 || f.Size > 48 || f.Min > f.Max {
		return f, fmt.Errorf("Invalid pagination or price range.")
	}
	if f.Sort == "" {
		f.Sort = "relevance"
	}
	if !contains([]string{"relevance", "price_asc", "price_desc", "popular", "title"}, f.Sort) {
		return f, fmt.Errorf("Unknown sorting option.")
	}
	if f.Platform != "" && !contains([]string{"Steam", "Xbox"}, f.Platform) {
		return f, fmt.Errorf("Unknown platform.")
	}
	if f.Region != "" && !contains([]string{"Global", "Europe"}, f.Region) {
		return f, fmt.Errorf("Unknown region.")
	}
	return f, nil
}
func contains(items []string, v string) bool {
	for _, s := range items {
		if s == v {
			return true
		}
	}
	return false
}

// Load catalog data with explicit SQL and apply the eligible-offer rule once.
// SQL computes trigram scores. The fallback uses edit distance for small demo catalogs.
func (a *App) list(r *http.Request, f filters) (Catalog, error) {
	scoreSQL := "similarity(lower(p.title),$1)"
	if a.Config.SearchMode == "fallback" {
		scoreSQL = "0::real"
	}
	rows, err := a.DB.Query(r.Context(), `SELECT p.id,p.slug,p.title,p.description,p.image,p.genre,p.popularity,p.discount,`+scoreSQL+` AS score,o.id,s.name,s.rating::float8,o.platform,o.region,o.price_cents,(SELECT count(*) FROM key_inventory k WHERE k.offer_id=o.id AND k.sold_order IS NULL)::int FROM products p JOIN offers o ON o.product_id=p.id JOIN sellers s ON s.id=o.seller_id WHERE ($2='' OR o.platform=$2) AND ($3='' OR o.region=$3) AND o.price_cents BETWEEN $4 AND $5 AND ($1::text IS NOT NULL) ORDER BY p.id,o.price_cents,o.id`, f.Q, f.Platform, f.Region, f.Min, f.Max)
	if err != nil {
		return Catalog{}, err
	}
	defer rows.Close()
	type ranked struct {
		product Product
		score   float64
		rank    int
	}
	all := []ranked{}
	lookup := map[int]int{}
	for rows.Next() {
		var p Product
		var o Offer
		var score float64
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Description, &p.Image, &p.Genre, &p.Popularity, &p.Discount, &score, &o.ID, &o.Seller, &o.Rating, &o.Platform, &o.Region, &o.Price, &o.Stock); err != nil {
			return Catalog{}, err
		}
		if o.Stock == 0 {
			continue
		}
		idx, exists := lookup[p.ID]
		if !exists {
			rank := 0
			title := strings.ToLower(p.Title)
			switch {
			case f.Q == "":
				rank = 1
			case title == f.Q:
				rank = 4
			case strings.HasPrefix(title, f.Q):
				rank = 3
			case strings.Contains(title, f.Q):
				rank = 2
			case score >= 0.22 && len(f.Q) >= 3:
				rank = 1
			case a.Config.SearchMode == "fallback" && len(f.Q) >= 3 && distance(title, f.Q) <= max(2, len([]rune(f.Q))/4):
				rank = 1
			}
			if rank == 0 {
				continue
			}
			p.Price = o.Price
			p.Offers = []Offer{}
			idx = len(all)
			lookup[p.ID] = idx
			all = append(all, ranked{p, score, rank})
		}
		all[idx].product.Offers = append(all[idx].product.Offers, o)
	}
	if err := rows.Err(); err != nil {
		return Catalog{}, err
	}
	sort.SliceStable(all, func(i, j int) bool {
		a, b := all[i], all[j]
		switch f.Sort {
		case "price_asc":
			if a.product.Price != b.product.Price {
				return a.product.Price < b.product.Price
			}
		case "price_desc":
			if a.product.Price != b.product.Price {
				return a.product.Price > b.product.Price
			}
		case "title":
			return a.product.Title < b.product.Title
		case "popular":
			if a.product.Popularity != b.product.Popularity {
				return a.product.Popularity > b.product.Popularity
			}
		default:
			if a.rank != b.rank {
				return a.rank > b.rank
			}
			if a.score != b.score {
				return a.score > b.score
			}
			if a.product.Popularity != b.product.Popularity {
				return a.product.Popularity > b.product.Popularity
			}
		}
		return a.product.ID < b.product.ID
	})
	out := Catalog{Items: []Product{}, Total: len(all), Page: f.Page, PageSize: f.Size}
	start := min((f.Page-1)*f.Size, len(all))
	end := min(start+f.Size, len(all))
	for _, p := range all[start:end] {
		out.Items = append(out.Items, p.product)
	}
	return out, nil
}
func distance(a, b string) int {
	ar, br := []rune(a), []rune(b)
	prev := make([]int, len(br)+1)
	for j := range prev {
		prev[j] = j
	}
	for i, c := range ar {
		cur := make([]int, len(br)+1)
		cur[0] = i + 1
		for j, d := range br {
			cost := 0
			if c != d {
				cost = 1
			}
			cur[j+1] = min(cur[j]+1, prev[j+1]+1, prev[j]+cost)
		}
		prev = cur
	}
	return prev[len(br)]
}
func (a *App) catalog(w http.ResponseWriter, r *http.Request) {
	f, e := parseFilters(r.URL.Query())
	if e != nil {
		fail(w, 400, e.Error())
		return
	}
	out, e := a.list(r, f)
	if e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, out)
}
func (a *App) suggestions(w http.ResponseWriter, r *http.Request) {
	f, e := parseFilters(r.URL.Query())
	if e != nil {
		fail(w, 400, e.Error())
		return
	}
	f.Size = 6
	f.Page = 1
	if f.Q == "" {
		write(w, 200, Catalog{Items: []Product{}})
		return
	}
	out, e := a.list(r, f)
	if e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, out)
}
func (a *App) product(w http.ResponseWriter, r *http.Request) {
	var p Product
	e := a.DB.QueryRow(r.Context(), `SELECT id,slug,title,description,image,genre,popularity,discount FROM products WHERE slug=$1`, chi.URLParam(r, "slug")).Scan(&p.ID, &p.Slug, &p.Title, &p.Description, &p.Image, &p.Genre, &p.Popularity, &p.Discount)
	if e == pgx.ErrNoRows {
		fail(w, 404, "Product not found.")
		return
	}
	if e != nil {
		serverError(w, e)
		return
	}
	rows, e := a.DB.Query(r.Context(), `SELECT o.id,s.name,s.rating::float8,o.platform,o.region,o.price_cents,(SELECT count(*) FROM key_inventory k WHERE k.offer_id=o.id AND k.sold_order IS NULL)::int FROM offers o JOIN sellers s ON s.id=o.seller_id WHERE o.product_id=$1 ORDER BY o.price_cents,o.id`, p.ID)
	if e != nil {
		serverError(w, e)
		return
	}
	defer rows.Close()
	p.Offers = []Offer{}
	for rows.Next() {
		var o Offer
		if e = rows.Scan(&o.ID, &o.Seller, &o.Rating, &o.Platform, &o.Region, &o.Price, &o.Stock); e != nil {
			serverError(w, e)
			return
		}
		p.Offers = append(p.Offers, o)
		if o.Stock > 0 && (p.Price == 0 || o.Price < p.Price) {
			p.Price = o.Price
		}
	}
	if e = rows.Err(); e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, p)
}
func (a *App) banner(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Eyebrow  string `json:"eyebrow"`
		Title    string `json:"title"`
		Subtitle string `json:"subtitle"`
		CTA      string `json:"cta"`
		Href     string `json:"href"`
	}
	e := a.DB.QueryRow(r.Context(), `SELECT eyebrow,title,subtitle,cta,href FROM homepage_content ORDER BY id LIMIT 1`).Scan(&b.Eyebrow, &b.Title, &b.Subtitle, &b.CTA, &b.Href)
	if e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, b)
}
func (a *App) bestSellers(w http.ResponseWriter, r *http.Request) {
	out, e := a.list(r, filters{Max: 1000000, Page: 1, Size: 6, Sort: "popular"})
	if e != nil {
		serverError(w, e)
		return
	}
	write(w, 200, out)
}
func (a *App) deals(w http.ResponseWriter, r *http.Request) {
	out, e := a.list(r, filters{Max: 1000000, Page: 1, Size: 48, Sort: "price_asc"})
	if e != nil {
		serverError(w, e)
		return
	}
	items := []Product{}
	for _, p := range out.Items {
		if p.Discount > 0 {
			items = append(items, p)
		}
	}
	out.Items = items[:min(6, len(items))]
	out.Total = len(items)
	write(w, 200, out)
}
