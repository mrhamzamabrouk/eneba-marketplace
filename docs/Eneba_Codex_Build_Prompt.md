> Submission privacy note: the original local machine path is replaced by [LOCAL_WORKSPACE]. The unchanged original is retained privately.

# Eneba assignment: Codex build prompt and follow-ups

## How to use

Open the existing `[LOCAL_WORKSPACE]` folder in VS Code. Start the Codex coding agent with access to this folder. Paste the master prompt below. Provide the original Eneba PDF when possible; its exact wording takes precedence over this brief. Preserve this planning conversation too: it is part of the AI assistance used for the assignment.

Target submission: 20 November 2026. Email deadline: seven days after receipt on 16 November, therefore 23 November 2026. Submit to internship@eneba.com with full name, assignment and English CV. Do not send an email automatically.

## Master prompt — paste everything in this section into Codex

You are my senior full-stack engineer and coding agent. Implement my Eneba Software Engineer Intern assignment end to end in this repository. Write and run the code yourself, fix failures, and prepare the GitHub and public deployment deliverables. Do not stop at a plan, scaffold, mock UI, or list of instructions for me. Work through the milestones below until the acceptance criteria are met or a specific external blocker prevents further work.

I am Hamza Mabrouk. Teach me as you build: after each milestone explain, in at most five short bullets, what changed, why we chose it, how to verify it, and one interview question with its answer. Use plain English and simple examples. Make routine engineering decisions yourself. Ask only for missing access, secrets, expenses or decisions that genuinely block progress. While blocked on hosting access, complete the remaining local work.

### Starting state

- Local Windows PowerShell project: [LOCAL_WORKSPACE]. Resolve the actual workspace root if running elsewhere; never assume you can access my Windows disk from a cloud environment.
- Git was initialized. Existing folders: frontend, backend, docs.
- backend/go.mod was initialized with module eneba.local/backend.
- Node, npm, Go and Git are installed on my computer. Inspect the actual agent environment separately. Check compatibility rather than trusting version numbers from this prompt.
- A minimal backend/main.go health handler may exist at /api/health, bound to 127.0.0.1:8080. Inspect before editing; preserve useful work and explain any necessary reorganization.
- Read applicable AGENTS.md instructions and inspect git status before changes. Never overwrite unrelated user edits.

### The assignment and non-negotiable deliverables

Build an Eneba-style marketplace with: a filterable/sortable store; backend-driven homepage blocks; global partial-name and typo-tolerant search; a product page comparing multiple sellers; cart and simulated payment delivering fake digital keys; registration/login; protected checkout and order history; and visual styling based on eneba.com.

React is required; use TypeScript. Backend must be Go. Use a real persistent database. The assignment encourages AI and agentic coding but requires the complete prompts and responses and the ability to explain the code. Scope decisions must be justified. Deliver: GitHub repository link, working public free-tier deployment URL, and full AI conversation history in Markdown or a working conversation link. My submission also needs an English CV and full name.

### Stack and architecture

- Frontend: React + TypeScript + Vite, React Router, TanStack Query, CSS with a small reusable token system, and Lucide icons where useful. Do not add Redux or a large UI framework without a concrete need.
- Backend: Go net/http with github.com/go-chi/chi/v5, github.com/jackc/pgx/v5 and pgxpool, github.com/pressly/goose/v3 for SQL migrations, and golang.org/x/crypto/bcrypt for password hashing. Use standard-library JSON, logging, random tokens and tests.
- PostgreSQL with explicit parameterized SQL. Prefer readable queries over a large ORM. Use pg_trgm for fuzzy search, with a documented tested fallback if the selected database cannot enable it.
- One backend application, a simple handler/service/database separation, and feature modules. No microservices, Redis, Kafka, Kubernetes, GraphQL or external search server.
- Homepage blocks each have their own backend endpoint/service and database-backed content. They may share one PostgreSQL instance. The frontend renders returned block content; it must not import product or banner fixtures.
- Production: build React and serve its static assets from Go on the same origin as /api. Correctly support client-side routes without returning index.html for missing API routes. Use Vite's /api proxy in development.
- Deployment candidate: one free Render web service with persistent PostgreSQL on Neon's free plan. Check current terms, quotas and extension support before using them. Never create paid resources, enter payment details or upgrade plans. If unsuitable, propose and implement another verified free option compatible with Go.
- Use environment configuration, a secret-free .env.example, lockfiles and pinned compatible dependencies. Provide PowerShell-friendly local commands. Support Docker Compose for local PostgreSQL if Docker is present; also document a direct DATABASE_URL route so Docker is not mandatory.

### Features and scope

1. Seed at least 24 varied fictional/demo product listings with game titles, descriptions, images, platforms, regions and believable EUR prices. Include at least three sellers and multiple offers for several products. Record asset sources/licensing or use clearly original placeholders; do not depend on broken or unauthorized hotlinks. Include a visible unofficial demo notice and no real sellable keys.
2. Homepage: database-backed banner, best sellers and deals blocks, independently fetched with useful loading and failure handling. Explain how best sellers are determined for the demo. Update a database record and verify the page changes without editing frontend source.
3. Store: pagination, platform/region/price filters and meaningful sorting; combine them correctly with search. Keep state in URL query parameters so refresh and shared links work. Define whether displayed starting prices and filters apply to eligible offers; use that rule consistently.
4. Search: available in the shared header, debounced suggestions, Enter opens full results, exact/prefix matches ranked above fuzzy matches, bounded query length and page size, and stale request cancellation or equivalent protection. Test a known typo such as Eldn Ring against Elden Ring, and partial names such as cyber. Support empty and no-match states and keyboard navigation.
5. Product details: platform, region, description and several seller offers with seller rating, price and stock. Selecting an offer must preserve the actual seller/offer identity through cart and order.
6. Cart: guests can browse and add offers; persist the guest cart locally without storing credentials or keys. Require login before checkout and keep the cart after login. Revalidate offer availability and prices on the server. Show changed prices and require reconfirmation rather than silently charging a different total.
7. Authentication: register, login, logout, current user and protected routes. Use established bcrypt functions with an explicit password byte-length policy. Store only password hashes. Use cryptographically random opaque session tokens, store token hashes in the database, expire/revoke sessions, and set HttpOnly, SameSite and production Secure cookies. Add explicit CSRF/origin protection for state-changing requests, input limits and reasonable login throttling. Do not store auth tokens in localStorage or invent cryptography.
8. Checkout: clearly simulated payment with success and failure options. Backend computes totals in integer cents, never trusts browser prices, and validates quantities/stock. Use a transaction and safe locking/constraints so concurrent purchases cannot receive the same key. Enforce idempotency per authenticated user: retries must not create a second order or consume more keys, and reusing a key with different contents must be rejected. Failed payment or insufficient stock must not issue keys or leave partial orders. Snapshot title, seller, price and currency on order items.
9. Order confirmation/history: purchased fake keys are visible only to the authenticated owner. A second account cannot access another user's order or keys by guessing an ID. Catalog APIs and application logs must never expose unpurchased keys, passwords or session tokens.
10. Visual quality: inspect the actual Eneba reference in a browser if available; otherwise request screenshots or document the limitation. Match its purple palette, dense game-card layout, header/search, hierarchy, spacing and offer presentation while clearly identifying this as an unofficial assignment. Check desktop and mobile. Include accessible labels, keyboard focus, alt text, readable contrast, skeletons, empty states and actionable errors. No dead navigation buttons or fake success messages.

Scope exclusions: real payments, seller administration, actual email verification/delivery, coupons, wishlists, reviews submission, currency conversion and real product-key activation. Document these honestly. Keep the database schema limited to what the implemented features need: users, sessions, products, sellers, offers, key inventory, homepage content, orders/order items and checkout idempotency records, or a similarly justified model.

### Working milestones — execute sequentially

M0: Inspect the repository/toolchain. Create docs/PLAN.md with a requirement checklist and milestone order. Establish a truthful full-conversation export strategy before substantial implementation. Create docs/DECISIONS.md and docs/STATUS.md. Verify documentation for dependencies where uncertain.

M1: Establish Go, React and database foundations; migrations, repeatable seed and /api/health plus database readiness. Build and run the production artifact early. Add a portable Docker build and deployment configuration. Document hosting prerequisites and request only missing access when needed.

M2: Implement the database schema, seed, homepage endpoints, store filtering/sorting/search and product offers. Add tests for relevant behavior. Connect real frontend pages to these APIs.

M3: Implement accounts, sessions, cart, atomic simulated checkout, fake key delivery and order history. Verify the complete purchase flow and failure cases before adding polish.

M4: Refine Eneba-style desktop/mobile UI with browser inspection. Fix accessibility and loading/error states. Do not substitute a visual mock for backend functionality.

M5: Run the verification matrix below, fix failures, complete CI and documentation. Deploy the exact tested source to a free service when access permits. Bind the deployed server to 0.0.0.0 and the host-provided PORT rather than the initial localhost-only address. Keep database data outside ephemeral service filesystems. Seed safely once without wiping existing orders on restart.

M6: Perform a fresh-browser evaluation of the deployed URL. Produce final deliverables and prepare me for a five-minute demo and code explanation. If an external step remains blocked, label the project incomplete and state exactly what I must do; do not claim a live deployment or GitHub push that never happened.

Keep the app working between milestones. Make focused local commits when Git identity is available; otherwise report the blocker without inventing an identity. Do not send application emails, publish my CV or personal data, expose credentials, or modify unrelated repositories. Use authenticated deployment/GitHub tools only within this project's scope. Before making source public, inspect it for secrets and private files; resolve repository visibility with me if it was not specified.

### Verification: implement meaningful checks and report actual results

- Backend: gofmt, go vet, go test ./..., plus PostgreSQL integration tests on an isolated test database. Include concurrent checkout/last-key contention, idempotent retries, payment failure rollback, server-side pricing, and order ownership. Never run destructive tests against the public demo database.
- Frontend: type checking, lint, production build, and targeted behavior tests for state with business consequences.
- Playwright against the real app/database: sign up; browse homepage; typo search; filter/sort; compare seller offers; add to cart; login if needed; simulate payment; view key and order history; logout; verify protected pages; verify a second user cannot read the order. Include cart persistence and a failed-payment path.
- On mobile check header/search, store filters, cards, product offers and checkout for overflow and touch usability.
- Production smoke test: readiness, API responses, assets, refreshed nested routes, session cookies, purchase flow, persistence after a restart and working repository/deployment/history links.
- Add a GitHub Actions workflow using a PostgreSQL service for the appropriate tests and builds. Do not mock away the core database/checkout behavior or weaken tests merely to make CI green.
- Report commands run, observed results, environment limitations and skipped checks. Never fabricate screenshots, passing tests, coverage or deployed behavior.

### AI transcript and documentation

The full AI history is mandatory, not an optional summary. Use an actual supported conversation export or session log when available. Include all user prompts and assistant responses used for this assignment, including follow-ups; retain tool activity if included by the exporter. Do not claim access to unavailable messages or hidden internal reasoning. If this environment cannot capture full text automatically, tell me immediately and provide exact export/share instructions while continuing other work. Mark any missing segments; never fabricate or silently reconstruct them. A running decision log is helpful but does not replace the transcript. Preserve originals privately; explicitly mark any required secret redactions in a submission copy.

Deliver docs/AI_HISTORY.md or a verified full-history link/index, docs/DECISIONS.md, docs/STATUS.md, docs/TEST_RESULTS.md, docs/DEPLOYMENT.md, docs/DEMO.md, and docs/INTERVIEW_PREP.md. README must cover architecture, versions, setup, migrations/seed, environment variables, tests, live URL, demo access, simulated-payment flow, limitations, free-tier cold starts, asset credits and AI usage. Give a Mermaid architecture diagram and a concise endpoint/schema overview. Keep all documents consistent with actual implementation.

Final response: GitHub URL, public URL, full-history location, verified features, tests/results, known limitations and exact remaining blockers. Also give ten interview questions with short answers tied to this code and a five-minute demonstration script. Remind me to attach my accurate English CV and full name. Do not invent CV facts or claim the position is guaranteed.

Start now by inspecting the workspace, establishing transcript capture and creating the plan, then proceed through implementation without requesting approval for each routine step.

## Follow-up prompts

### 1. The agent stops after planning or scaffolding

Continue implementation from docs/STATUS.md and git status. The goal is the complete assignment, not a scaffold. Identify the next incomplete acceptance criterion, implement it, run relevant verification and keep going through the milestones. Ask me only for a concrete external blocker. Update the checklist with evidence.

### 2. You open a new Codex session

Read AGENTS.md, README, docs/PLAN.md, docs/DECISIONS.md and docs/STATUS.md, inspect git status, and run the smallest useful health/build checks. Continue from the first incomplete milestone without recreating the project. Add this new conversation to the full AI-history index and preserve previous logs. Explain the next action briefly, then execute it.

### 3. A command or feature fails

Reproduce this failure: [paste the exact command, output and user action]. Trace the root cause through the actual code/configuration. Make the smallest correct fix and run a regression check. Do not disable validation, remove tests, replace PostgreSQL with mock data or rewrite unrelated features. Report cause, change and observed result.

### 4. The app looks generic or unlike Eneba

Compare the running app to eneba.com and the assignment reference at desktop and mobile widths. If the reference is inaccessible, tell me what screenshot is needed. List the five highest-impact visual gaps, then fix them: header/search, purple palette, density, typography, product cards and seller offers. Keep APIs and business behavior intact. Verify with fresh browser screenshots and check keyboard/mobile usability.

### 5. The UI works but data is fake or hardcoded

Audit every page and homepage block for frontend fixtures, hardcoded product arrays, fake checkout handlers and stubbed authentication. Replace them with the real Go API and persistent database. Demonstrate that changing database content changes the UI without frontend source edits. Show a purchase persisted in order history after refresh and a service restart.

### 6. Before deployment

Build and run the production artifact locally. Verify PORT binding, same-origin routing/cookies, nested-route refresh, migrations, safe seed behavior, external PostgreSQL persistence and absence of secrets in source/images/logs. Check current free-tier terms. Prepare or perform the free deployment using available authenticated access, and give me only the exact account actions or secret names you cannot complete. Never ask me to paste credentials into chat.

### 7. Before submission: strict final review

Act as a skeptical Eneba reviewer. Map every original PDF requirement to implementation and runtime evidence. Test the deployed app in a fresh browser and attempt failures, duplicate checkout, stock contention and cross-user order access. Check the GitHub, deployment and complete AI-history links. Fix critical gaps, rerun affected checks and produce an honest ready/not-ready verdict. Do not treat documentation claims as proof.

### 8. Prepare me to explain the code

Teach me this exact implementation in small steps. First explain one purchase from browser to database and back using a simple diagram. Then explain routing, React state vs server data, SQL tables, fuzzy search, sessions, password hashing, transactions and idempotency in plain English. Point to the real files/functions. Ask me one short question at a time and correct misunderstandings before moving on.

### 9. The AI history is incomplete

Audit transcript completeness against every session used for this project. Identify exactly which prompts/responses or earlier planning conversations are missing. Use supported original exports or verified full conversation links to fill gaps; do not substitute summaries, invent content or claim unavailable exports exist. Tell me the precise manual export action needed if you cannot do it, then verify the resulting history index.

### 10. Prepare the application package

Prepare a concise human email addressed to internship@eneba.com with my full name, tested GitHub/public-app/AI-history links, demo instructions and an attachment checklist for my English CV. Check actual repository visibility and link access. Ask for the CV if missing; do not invent experience or qualifications. Show me the complete package for review and do not send the email.

## Sources checked for this plan

- Original Eneba email and attached Eneba Intern Assignment 2027, received 16 November 2026.
- https://github.com/go-chi/chi
- https://github.com/jackc/pgx
- https://github.com/pressly/goose
- https://pkg.go.dev/golang.org/x/crypto/bcrypt
- https://www.postgresql.org/docs/current/pgtrgm.html
- https://render.com/docs/free
- https://neon.com/pricing
- https://vite.dev/guide/

Provider plans and dependency compatibility must be rechecked by the coding agent at implementation time.
