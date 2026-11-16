package app

import (
	"context"
	"database/sql"
	"embed"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrations embed.FS

type Config struct {
	DatabaseURL, Origin, SearchMode string
	Secure                          bool
}
type App struct {
	DB       *pgxpool.Pool
	Config   Config
	throttle limiter
}

func Open(ctx context.Context, cfg Config) (*App, error) {
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	defer db.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, db, mustSub())
	if err != nil {
		return nil, err
	}
	if _, err = provider.Up(ctx); err != nil {
		return nil, err
	}
	pc, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	pc.MaxConns = 8
	pc.MaxConnLifetime = 30 * time.Minute
	pc.ConnConfig.ConnectTimeout = 10 * time.Second
	pool, err := pgxpool.NewWithConfig(ctx, pc)
	if err != nil {
		return nil, err
	}
	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	var trigrams bool
	if err = pool.QueryRow(ctx, `SELECT to_regprocedure('similarity(text,text)') IS NOT NULL`).Scan(&trigrams); err != nil {
		pool.Close()
		return nil, err
	}
	if !trigrams {
		cfg.SearchMode = "fallback"
	}
	return &App{DB: pool, Config: cfg}, nil
}
func (a *App) Close() { a.DB.Close() }
