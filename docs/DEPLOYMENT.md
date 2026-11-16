# Free deployment preparation

No public app deployment has been created. The source is published at https://github.com/mrhamzamabrouk/eneba-marketplace and runtime source passed remote CI. No paid resource or payment method has been used. The checked-in Dockerfile and Render blueprint build one Go service containing the React assets; PostgreSQL stays external.

## Provider verification, 16 November 2026

[Render Free documentation](https://render.com/docs/free): Free web services sleep after 15 idle minutes, may take about a minute to wake, and lose local filesystem changes on restarts/redeploys. Free PostgreSQL on Render expires, so do not use it for persistent assignment data. Check dashboard resource/usage limits before provisioning; choose Free and never upgrade or add a payment method.

[Neon pricing](https://neon.com/pricing): Free is $0 without a credit card, currently 100 CU-hours per project/month and 1 GB storage per project. Use one small project. [Neon's pg_trgm guide](https://neon.com/docs/extensions/pg_trgm) confirms the extension is supported. Account limits and selected plan must still be checked in the actual account at creation time.

## Exact remaining access steps

1. Neon, Render and GitHub are now confirmed installed, and the user confirmed connected. GitHub account access was verified. The current session does not expose Neon/Render tools; start a new session in this same workspace to activate newly installed plugin tools if they remain unavailable. Do not request credentials in chat or unnecessarily reconnect working accounts.
2. The user-authorized public source is pushed under mrhamzamabrouk: https://github.com/mrhamzamabrouk/eneba-marketplace. Do not recreate it or re-request authorization. Private commit email was removed from the agent-created initial commit and a GitHub noreply address configured for this repository only. Source/transcript privacy review excludes private originals, CV, tokens and unrelated account labels. Check STATUS.md for the passing CI source revision.
3. Create a Neon **Free** project/database in a region near Render. Save its TLS connection string directly in Render's secret environment configuration as `DATABASE_URL`. Do not paste it into chat, source, screenshots or command output.
4. Create a Render **Free** Docker web service from the reviewed repository, using the root Dockerfile or render.yaml blueprint. Set `APP_ORIGIN` to its exact assigned HTTPS URL, `SECURE_COOKIES=true`, `SEED_DEMO=true`, and `SEARCH_MODE=trigram`. Render supplies `PORT`. Use `/api/ready` for readiness.
5. Deploy the exact tested commit, record the commit SHA and URL, and perform the fresh-browser checks below. Do not call the assignment ready just because a build succeeds.

Startup runs versioned goose migrations, then an insert-only seed when requested. The seed locks one advisory transaction, does not overwrite existing products/banner edits, does not replenish sold keys, and never deletes users or orders. Offer inventory is seeded only when that offer is first inserted. All mutable state is in PostgreSQL, never the container filesystem.

## Local production/container verification

```powershell
docker build -t eneba-demo:test .
docker run --rm --name eneba-demo-smoke --network eneba-marketplace_default -p 127.0.0.1:8082:8080 -e DATABASE_URL=postgres://eneba:localdemo@db:5432/eneba_e2e_test?sslmode=disable -e APP_ORIGIN=http://localhost:8082 -e SECURE_COOKIES=false -e SEED_DEMO=true eneba-demo:test
```

That URL/password is a loopback development fixture, not a production credential. In another terminal check `Invoke-RestMethod http://localhost:8082/api/ready`. Production cookies must be Secure with HTTPS. The integration tests exercise the Secure flag, while local browser tests intentionally use HTTP and `SECURE_COOKIES=false`.

## Required fresh public evaluation

- Open the URL in a clean browser context; verify homepage, typo search, combined store filters, and seller selection.
- Register a demo account, preserve the guest cart, exercise declined and successful simulated payments, refresh the order page and inspect fake keys.
- Check session HttpOnly/SameSite/Secure flags over HTTPS, origin rejection, logout and a second account's denied order access.
- Refresh `/product/elden-ring`, `/store`, and `/orders`; verify JavaScript/CSS/artwork requests succeed and missing `/api/...` remains JSON 404.
- Record an order ID privately, restart the service, sign in again and verify the same order/keys remain. Do not run destructive contention tests against the public database.
- Open GitHub, app and full AI-history links as a reviewer. Record the deployed commit and actual results in TEST_RESULTS.md.

## Recovery

Revert to a known tested source revision if needed; current migrations are additive and no destructive migration runs automatically. Do not run goose down against public data. Keep Neon data independent of the web-service lifecycle. If a free quota is exhausted, report the limitation; never purchase an upgrade. Cold starts are expected and should be mentioned in the submission.
