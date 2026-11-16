# Live free deployment

**Public app:** https://eneba-marketplace-demo-uuhw.onrender.com

**Source:** https://github.com/mrhamzamabrouk/eneba-marketplace

Deployed and evaluated on 16 November 2026. Register your own demo account with an example.com address and a unique test password. Payments and keys are simulated; no card details or email delivery are involved.

## Actual resources

| Resource | Verified configuration |
| --- | --- |
| Render service | `srv-dbtf22jncjis73a377u0`, eneba-marketplace-demo, Free Docker web service, Frankfurt |
| Render dashboard | https://dashboard.render.com/web/srv-dbtf22jncjis73a377u0 |
| Neon project | `super-salad-02795926`, eneba-marketplace, verified Free organization, AWS eu-central-1 |
| Database | PostgreSQL 17, database eneba, role eneba_owner; fixed 0.25 CU with scale-to-zero |
| Runtime source | `2ca1486f16dbd93e01095e06ac1ec89c7683c599` |
| Live deployment | `dep-dbtf2p0ae00c73d8ahk0`, live at 12:05:16 UTC |
| Restart check | New server startup at 12:10:05 UTC; same order and fake key recovered after a fresh login |
| Health check | `/api/ready`; Render-provided PORT, bound to `0.0.0.0:10000` |

The public repository main branch builds using the root multistage Dockerfile. Auto-deploy is off; deployments explicitly target a reviewed, passing commit. The checked-in render.yaml validates successfully as a reusable template; this existing service was API-created and is not Blueprint-managed. Do not create duplicate resources to apply changes.

Installed Render/Neon plugin skills guided the deployment. Their remote tools were not exposed in this session, so official Render CLI 2.36.0, Neon CLI 9.5.0 and the official Render API were used after the user completed browser authorization. Render credentials stay in its standard CLI store; Neon uses its keyring-backed eneba-deployment profile. The database URL was transferred directly from the authenticated Neon CLI to Render in process memory, without logging or a source-file copy.

## Runtime configuration

| Name | Live setting |
| --- | --- |
| `DATABASE_URL` | Secret stored only in Render environment configuration; direct Neon TLS connection, sslmode=verify-full |
| `APP_ORIGIN` | https://eneba-marketplace-demo-uuhw.onrender.com |
| `SECURE_COOKIES` | true |
| `SEED_DEMO` | true |
| `SEARCH_MODE` | trigram |
| `PORT` | Supplied by Render |

The direct TLS endpoint supports startup goose migrations; the application bounds its pgxpool to eight connections. Production HTTPS cookies are Secure, HttpOnly and SameSite=Lax. All mutable state lives in Neon PostgreSQL, never the ephemeral web-service filesystem.

Startup runs versioned migrations and an insert-only seed inside an advisory lock. It does not overwrite existing product/banner edits, replenish sold keys, or delete users/orders. Seed inventory is inserted only for newly inserted offers. Restart persistence was verified on this actual deployment.

## Updating this deployment

1. Implement and test changes locally using isolated test databases. Run the appropriate checks and wait for passing GitHub Actions on the source revision.
2. Reuse the existing service and database; keep both Free plans. Do not print secrets or copy the database URL into commands/source/screenshots.
3. Deploy the tested commit explicitly. With the authenticated Render CLI available on PATH:

   ```powershell
   render deploys create srv-dbtf22jncjis73a377u0 --commit <tested-commit-sha> --wait --confirm --output json
   ```

   The project-local executable is `.tools/render-cli/render.exe`; it is ignored, not distributed with the repository. Authenticate through the official browser flow if access actually expires.

4. Verify readiness, the changed flow and production smoke behavior. Record the actual deployed SHA/results. Documentation-only updates do not require a runtime redeployment.

Do not run goose down, destructive Go integration tests, or database resets against public data. Use local `_test` databases for contention and migration tests. A controlled public browser evaluation may create ordinary demo accounts and simulated purchases; routine test runs belong on an isolated server.

## Observed public evaluation

All eight desktop/mobile Playwright scenarios passed against the public URL in 50.8 seconds. Separate checks passed for readiness, typo-search API, HTTPS cookie flags, foreign Origin rejection, nested-route refresh, JS/CSS requests, homepage image decoding and distinct missing API/static 404s. A real Render restart retained a purchased order and the exact same fake key. See TEST_RESULTS.md for details and limits.

## Free-tier behavior and recovery

Both selected resources were verified as Free before creation. No upgrade, payment method or purchase was made. [Render Free services](https://render.com/docs/free) sleep after 15 idle minutes and can take about a minute to wake; local filesystem changes do not persist. [Neon Free](https://neon.com/pricing) was checked at deployment (100 CU-hours and 1 GB per project); its actual organization plan was verified as free. Monitor account quotas; if exhausted, report the limitation instead of purchasing an upgrade.

Roll back to a known tested commit if needed; current startup migrations are additive. Keep Neon data independent of service replacements. Never expose credentials in issue reports or logs. The missing earlier AI planning transcript affects submission completeness, not this live app's availability.
