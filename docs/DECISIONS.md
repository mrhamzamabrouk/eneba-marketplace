# Engineering decisions

2026-11-16: Preserve the existing build prompt. Existing backend/maing.go is a minimal localhost health server; reorganize into the real server after inspection. Git has Hamza's existing identity; use a command-local safe.directory exception because sandbox ownership differs, without changing global Git configuration.

Use Go net/http + chi, pgxpool, goose and bcrypt; React/TypeScript + Vite, Router and TanStack Query. PostgreSQL is required locally and in production; never replace checkout with an in-memory mock. Serve compiled React assets from Go, with distinct API 404s.

Production target: Render Free web service + external Neon Free PostgreSQL. Sites runs JavaScript Workers and cannot host this required Go process, so use its local workflow guidance only. No service has been provisioned.

Prices are integer EUR cents. Platform and region belong to offers. Catalog minimum price, filtering and returned offers all use the same eligible, in-stock offer set. Original geometric cover art avoids third-party image hotlinks. Named games are demo references; no real licenses are sold.
