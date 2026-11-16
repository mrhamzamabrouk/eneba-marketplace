# Implementation plan

Authority: original Eneba Internship Assignment PDF, then the Master prompt in Eneba_Codex_Build_Prompt.md. No applicable AGENTS.md found on initial inspection.

- [x] M0: Inspected all initial files/toolchain and both original PDF pages; original-message export plus bounded watcher established. Earlier planning remains explicitly missing.
- [x] M1: Go/React/PostgreSQL foundations, embedded goose migrations, insert-only seed, running production executable, successful portable Docker build and free-host configuration.
- [x] M2: Independent database-backed homepage blocks, combined URL filters, pagination, partial/fuzzy search including a tested extension-free fallback, seller offers.
- [x] M3: Bcrypt/session/origin checks, persistent guest cart, atomic price-checked idempotent checkout and private keys/history; database contention and full browser flow verified.
- [x] M4: Actual Eneba browser reference, original local artwork, desktop/mobile screenshot review, keyboard flow and overflow assertions.
- [x] M5 local: Go vet and 11 Go tests including isolated PostgreSQL, also passed inside Go 1.25 Docker; frontend lint/typecheck/build and four behavior tests; all eight final desktop/mobile browser scenarios passed against the production container. CI authored, Docker smoke/restart persistence passed.
- [ ] M6: Public deployment and fresh-browser verification, GitHub/history links, demonstration and explanation package.

Acceptance evidence belongs in TEST_RESULTS.md. Public deployment belongs to M6 and remains blocked by account access. Incomplete external deliverables stay incomplete. Never send application email or purchase services.
