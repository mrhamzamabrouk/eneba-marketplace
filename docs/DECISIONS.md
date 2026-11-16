# Engineering decisions

2026-11-16: Preserve the existing build prompt. Existing backend/maing.go is a minimal localhost health server; reorganize into the real server after inspection. Git has Hamza's existing identity; use a command-local safe.directory exception because sandbox ownership differs, without changing global Git configuration.

Use Go net/http + chi, pgxpool, goose and bcrypt; React/TypeScript + Vite, Router and TanStack Query. PostgreSQL is required locally and in production; never replace checkout with an in-memory mock. Serve compiled React assets from Go, with distinct API 404s.

Production target: Render Free web service + external Neon Free PostgreSQL. Sites runs JavaScript Workers and cannot host this required Go process, so use its local workflow guidance only. No service has been provisioned.

Prices are integer EUR cents. Platform and region belong to offers. Catalog minimum price, filtering and returned offers all use the same eligible, in-stock offer set. Original geometric cover art avoids third-party image hotlinks. Named games are demo references; no real licenses are sold.

The catalog is deliberately small: SQL reads eligible offer data and trigram scores, then Go ranks/sorts/paginates the 24 products. This is readable and testable for the assignment; full SQL pagination/index-driven ranking is the scaling path. Migration 002 makes pg_trgm optional; a test drops the actual extension and verifies automatic edit-distance fallback.

Checkout stores the first normalized request fingerprint before the purchase transaction so even a failed attempt's token cannot be reused with different contents. A per-user locked idempotency row and sorted offer locks serialize retries/contention. The order, item snapshots, key assignments and committed idempotency result are atomic. Payment and stock failures issue no keys or orders.

Initial frontend pins had audit findings. Patched Router 7.18.5, Vite 7.3.8 and Vitest 4.1.12 were selected, plus TypeScript ESLint 8.72.2 with a bounded minimatch 11.0.1 override for its parser dependency. Typecheck, lint, tests and npm audit verify this combination. No forced peer-dependency bypass was used. Password minimums are enforced in UTF-8 bytes on the server; the form avoids a contradictory character-count minimum.

The user authorized public publication under mrhamzamabrouk, after privacy review. Use GitHub noreply metadata, exclude raw logs/PDF/CV/secrets, and publish only project files. No global Git identity is changed. Account connection failures do not justify inventing a successful push.
