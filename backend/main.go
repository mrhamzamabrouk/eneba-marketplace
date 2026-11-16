package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"eneba.local/backend/internal/app"
)

// public_placeholder keeps standalone backend tests buildable before the React build exists.
//
//go:embed public*
var assets embed.FS

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	cfg := app.Config{DatabaseURL: os.Getenv("DATABASE_URL"), Origin: strings.TrimRight(os.Getenv("APP_ORIGIN"), "/"), Secure: os.Getenv("SECURE_COOKIES") == "true", SearchMode: os.Getenv("SEARCH_MODE")}
	if cfg.Origin == "" {
		cfg.Origin = "http://localhost:8080"
	}
	if cfg.Secure && !strings.HasPrefix(cfg.Origin, "https://") {
		log.Fatal("production cookies require an https APP_ORIGIN")
	}
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	a, err := app.Open(ctx, cfg)
	if err != nil {
		log.Fatal("database initialization failed; check connection and migrations")
	}
	defer a.Close()
	if os.Getenv("SEED_DEMO") == "true" {
		if err := a.Seed(ctx); err != nil {
			log.Fatal("demo seed failed")
		}
	}
	public, _ := fs.Sub(assets, "public")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{Addr: ":" + port, Handler: a.Router(public), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 16}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	log.Printf("Eneba demo listening on 0.0.0.0:%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("HTTP server failed")
	}
}
