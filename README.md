# Eneba Play — unofficial assignment demo

A React/TypeScript marketplace served by one Go application, backed by persistent PostgreSQL. Hamza Mabrouk's internship assignment. All offers, seller ratings and keys are demonstration data; no real payment, license sale or email delivery occurs.

Verified: 11 Go/database tests, four cart behavior tests, eight desktop/mobile browser scenarios, production Docker smoke/restart persistence, zero npm audit findings, and a [successful GitHub Actions run](https://github.com/mrhamzamabrouk/eneba-marketplace/actions/runs/43851025137).

**Submission status: incomplete.** GitHub: [mrhamzamabrouk/eneba-marketplace](https://github.com/mrhamzamabrouk/eneba-marketplace). Public app URL: not deployed. [AI history index](docs/AI_HISTORY.md) includes original implementation messages with explicit privacy redactions; earlier planning history remains missing. Do not submit until all mandatory deliverables work for a reviewer.

## What works

- Three independently fetched database-backed homepage blocks: banner, best sellers and deals.
- 24 named demo game listings, three sellers, 72 distinct offers, original local artwork.
- Catalog pagination, platform/region/price filters, sorting and partial/typo search; URL state survives refresh.
- Seller comparison and a persistent guest cart preserving the actual offer identity.
- Bcrypt registration/login, opaque cookie sessions, protected checkout/history and origin checks.
- Simulated success/failure payments, integer-cent server pricing, explicit price reconfirmation, atomic key allocation and per-user checkout idempotency.
- Private fake-key delivery, order history, responsive screens and keyboard search.

## Architecture

```mermaid
flowchart LR
    Browser[React browser app] -->|same-origin REST /api| Go[Go net/http + chi]
    Go --> Catalog[Catalog and homepage handlers]
    Go --> Auth[Bcrypt + hashed cookie sessions]
    Go --> Checkout[Transactional checkout]
    Catalog --> DB[(PostgreSQL + pg_trgm)]
    Auth --> DB
    Checkout --> DB
    Go --> Assets[Embedded React build + local SVGs]
```

`backend/internal/app` separates HTTP routing, catalog queries, authentication, transactional checkout, migrations and seed. React's `state.tsx` holds guest-cart state; TanStack Query handles server data. There are no frontend product/banner fixtures. See [endpoint/schema overview](docs/API.md) and [decisions](docs/DECISIONS.md).

## Versions and setup

Verified host: Windows PowerShell, Go 1.27.4, Node 25.2.1, npm 11.6.2, PostgreSQL 17.6 in Docker. The portable build targets Go 1.25 and Node 24. Exact frontend versions and transitive dependencies are pinned in `frontend/package-lock.json`; Go modules are pinned in `backend/go.mod` and `go.sum`.

From the repository root:

```powershell
docker compose up -d db
Copy-Item .env.example .env
./scripts/build.ps1
./scripts/start.ps1
```

Open http://localhost:8080. If the restricted shell cannot find installed Node, prepend its actual installation directory to `$env:Path`. Never check real connection strings into Git.

Docker is optional. Use any PostgreSQL 17+ database, create a dedicated application database, and set `DATABASE_URL` instead of the example. The server automatically applies embedded goose migrations on startup. The database user needs schema/table privileges; `pg_trgm` installation requires the appropriate database privilege. If unavailable, migration 002 tolerates that condition and the app automatically selects an edit-distance fallback. `SEARCH_MODE=fallback` explicitly exercises it. This small-catalog fallback prioritizes exact/prefix/substring matches and supports `Eldn Ring`; it is not a general search engine.

For hot reload, run the Go server in one terminal and `npm.cmd run dev` inside `frontend` in another. Set `APP_ORIGIN=http://localhost:5173` for that development session; Vite proxies `/api` to port 8080. Rebuild production assets before evaluating the embedded production server.

## Environment

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Required PostgreSQL connection string; external production storage, with TLS enabled |
| `APP_ORIGIN` | Exact browser origin, e.g. `http://localhost:8080` locally or your `https://...onrender.com` URL |
| `PORT` | HTTP port; defaults to 8080, listens on all interfaces |
| `SECURE_COOKIES` | Set `true` in production; requires an HTTPS origin |
| `SEED_DEMO` | `true` safely inserts missing seed rows; never wipes orders, edits or sold inventory |
| `SEARCH_MODE` | `trigram` default, or `fallback` for bounded demo search |
| `TEST_DATABASE_URL` | Integration tests only; database name must end in `_test` |
| `E2E_BASE_URL` | Browser test server; defaults to `http://localhost:8080` |

No production secret is shipped. Local Compose's password is an intentionally public development placeholder on a loopback port.

## Using the demo

Register with an example.com address and a unique test password (10–72 UTF-8 bytes). There is no shared demo account. Browse a game, compare the three offers, add one to the cart and continue to checkout. Guests are redirected to sign in with the cart intact. Choose a successful or declined simulated payment. Success displays fake keys and saves the order; failure retains the cart and creates no order. No card details are requested.

All catalog starting prices and filters use **in-stock offers matching the active platform, region and price filters**. Product details show all seller offers, including stock counts. Seeded `popularity` is a fixed demo popularity score used for best sellers, not a claim about real purchases. Deals use seeded merchandising flags and ascending eligible prices; no fabricated original price is shown.

To verify backend-driven content, update `homepage_content.title` for ID 1 in your local database, then reload the homepage. The seed does not overwrite the edit. Restore it afterward. The integration suite checks this behavior without frontend changes.

## Verification

Create an isolated test database first:

```powershell
docker compose exec -T db createdb -U eneba eneba_test
$env:TEST_DATABASE_URL='postgres://eneba:localdemo@localhost:5432/eneba_test?sslmode=disable'
Push-Location backend
gofmt -w .
go vet ./...
go test -count=1 -v ./...
Pop-Location
Push-Location frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npx.cmd playwright install chromium
# Start the rebuilt production server against a separate *_test database first.
npm.cmd run test:e2e
Pop-Location
```

Tests must never target the public demo database. Integration tests create disposable schemas only in the explicitly supplied `_test` database. Browser tests create test accounts and purchase demo inventory; use an isolated test server. [Actual results and limits](docs/TEST_RESULTS.md) distinguish executed checks from unexecuted CI/public checks.

## Deployment and scope

The multistage [Dockerfile](Dockerfile) embeds React in Go and runs as a non-root user. [Render blueprint](render.yaml) selects the Free plan; use an external Neon Free PostgreSQL database. [Deployment instructions](docs/DEPLOYMENT.md) include prerequisites, exact environment names and a production verification checklist. Render Free sleeps after inactivity and has an ephemeral filesystem; all changing application data lives in PostgreSQL.

Excluded: real payments, actual key activation, seller administration, email verification/delivery, coupons, wishlists, submitted reviews and currency conversion. Catalog matching/ranking is intentionally bounded to a small demo catalog and sorted in Go after SQL reads; moving pagination/ranking fully into indexed SQL is the scaling path. The in-memory login throttle resets on restart and is scoped to this single-server demo; proxy IPs are not blindly trusted. History shows the latest 100 orders. There is no password reset or account recovery.

## Assets and AI usage

All 24 SVG covers are original geometric illustrations generated by [the local source script](scripts/generate-covers.mjs). They contain no publisher artwork or remote images. Named games and Eneba are third-party marks used as assignment references, without affiliation. Hero artwork is original CSS. Icons: Lucide, ISC license. System fonts only; no remote fonts or tracking.

AI wrote and tested the implementation with the user's instructions. Original visible prompts/responses are exported from the actual Codex rollout, with a private original copy and explicit coverage gaps. [AI history](docs/AI_HISTORY.md) is mandatory; a decision log does not replace it. See [five-minute demo](docs/DEMO.md) and [ten code-specific questions](docs/INTERVIEW_PREP.md).
