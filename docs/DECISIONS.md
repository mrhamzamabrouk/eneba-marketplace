# Engineering decisions

2026-11-16: Preserve the existing build prompt. Existing backend/maing.go is a minimal localhost health server; reorganize into the real server after inspection. Git has Hamza's existing identity; use a command-local safe.directory exception because sandbox ownership differs, without changing global Git configuration.

Use Go net/http + chi, pgxpool, goose and bcrypt; React/TypeScript + Vite, Router and TanStack Query. PostgreSQL is required locally and in production; never replace checkout with an in-memory mock. Serve compiled React assets from Go, with distinct API 404s.

Production: one Render Free Docker web service + external Neon Free PostgreSQL, both in Frankfurt. Sites runs JavaScript Workers and cannot host this required Go process. The actual service/project and verified deployment are recorded in DEPLOYMENT.md.

Prices are integer EUR cents. Platform and region belong to offers. Catalog minimum price, filtering and returned offers all use the same eligible, in-stock offer set. Original geometric cover art avoids third-party image hotlinks. Named games are demo references; no real licenses are sold.

The catalog is deliberately small: SQL reads eligible offer data and trigram scores, then Go ranks/sorts/paginates the 24 products. This is readable and testable for the assignment; full SQL pagination/index-driven ranking is the scaling path. Migration 002 makes pg_trgm optional; a test drops the actual extension and verifies automatic edit-distance fallback.

Checkout stores the first normalized request fingerprint before the purchase transaction so even a failed attempt's token cannot be reused with different contents. A per-user locked idempotency row and sorted offer locks serialize retries/contention. The order, item snapshots, key assignments and committed idempotency result are atomic. Payment and stock failures issue no keys or orders.

Initial frontend pins had audit findings. Patched Router 7.18.5, Vite 7.3.8 and Vitest 4.1.12 were selected, plus TypeScript ESLint 8.72.2 with a bounded minimatch 11.0.1 override for its parser dependency. Typecheck, lint, tests and npm audit verify this combination. No forced peer-dependency bypass was used. Password minimums are enforced in UTF-8 bytes on the server; the form avoids a contradictory character-count minimum.

The user authorized public publication under mrhamzamabrouk, after privacy review. Use GitHub noreply metadata, exclude raw logs/PDF/CV/secrets, and publish only project files. No global Git identity is changed. Account connection failures do not justify inventing a successful push.

Deployment access: the installed Render/Neon plugins supplied skills, but their remote tools were absent in this running session. Official Render and Neon CLIs completed browser authorization with the user; the official Render API created the Free service. Credentials remain in the standard CLI store/keyring; the Neon URL was transferred directly in memory to Render secret configuration. No database credentials were printed or committed. Reuse the existing resources rather than creating duplicates.

Use a direct Neon TLS connection with sslmode=verify-full for startup migrations and the application's bounded eight-connection pgxpool. Neon compute is fixed at 0.25 CU on the verified Free organization, with scale-to-zero. Render auto-deploy is off so deployment can target a reviewed, passing source SHA explicitly. Documentation-only updates do not require a runtime deployment.
