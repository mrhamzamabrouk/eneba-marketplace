# Actual verification results — 16 November 2026

This file records observed execution, not promises or coverage claims. No public app deployment has been verified yet. The source repository and remote CI are verified below.

| Check | Observed result |
| --- | --- |
| Original requirements | Both original PDF pages extracted completely, rendered and visually inspected; private original retained |
| Go formatting and vet | `gofmt -w .` and `go vet ./...` passed |
| Go tests, PostgreSQL | `TEST_DATABASE_URL=.../eneba_test`, `go test -count=1 -v ./...`: 11 tests passed on Windows (39.215s) and inside the Go 1.25 Docker builder (14.256s); vet also passed in both |
| Actual extension-free fallback | Test dropped pg_trgm in the disposable test database, reopened the app, and found Elden Ring for Eldn Ring |
| Concurrent checkout | Two buyers for one remaining key: one 201 and one 409; one order/item allocated |
| Idempotency | Eight concurrent identical retries returned one order; changed contents rejected; tokens scoped per user; changed contents after a failed payment rejected |
| Rollback and pricing | Payment failure, wrong expected price and a multi-offer cart with missing stock issued no extra keys or partial orders |
| Order privacy | Anonymous access 401; second account 404; catalog JSON contains no inventory keys |
| Sessions | Bcrypt/hash storage, HttpOnly/SameSite cookie, production Secure flag, revocation, expiry, origin rejection and auth throttle passed |
| Frontend checks | `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` passed; four cart behavior tests |
| Dependency audit | `npm audit --audit-level=moderate`: zero vulnerabilities after compatible patched pins/override |
| Real browser flow | Final eight Playwright scenarios passed against the rebuilt production Docker image on desktop Chrome and Pixel 7 emulation in 1.4m, including the Unicode password-byte regression |
| Browser scope | Homepage, typo/partial/keyboard search, combined filters/sort and refresh, seller comparison, guest persistence, signup/login, failed/successful checkout, explicit price acceptance, keys/history/logout and second-account denial |
| Visual inspection | Actual eneba.com screenshot plus local desktop/home/product and mobile/home/checkout screenshots inspected; no horizontal overflow assertions on checked pages |
| Database-driven browser content | Edited the isolated test database's banner, observed new heading in a fresh real browser, then restored the original; no frontend source edit |
| Portable Docker | Production image built with Node 24 / Go 1.25, application runs non-root |
| Remote GitHub Actions | [Run 43851025137](https://github.com/mrhamzamabrouk/eneba-marketplace/actions/runs/43851025137) completed successfully for b6d7e8c3cda4bf62249877abccc3fab20d287b03: frontend checks/audit, real PostgreSQL tests, production build and all browser scenarios |
| Public source/history links | Public repository main/tree verified over unauthenticated HTTPS; 104 source paths inspected, no private/generated files; history index returned HTTP 200 |
| Container smoke/restart | Production readiness, nested routes, JS/CSS, API/asset 404s, origin check, cookies, declined/successful checkout and duplicate retry passed; same order/key survived actual container restart |
| Final local preview | http://localhost:8080 returned ready and references the final tested React bundle; app/PostgreSQL retained, temporary test servers stopped |
| AI history | Verified original rollout; Markdown prompts/responses export and private original copy. Earlier planning still missing; final-response capture must be checked after it is written |

## Failures found and fixed

- Restricted shell could not access installed Node, Go cache or Docker; approved elevated commands resolved tool access. Docker daemon was initially stopped and was started.
- Initial older frontend pins had audit findings; compatible upgrades and a scoped minimatch override reduced the audit to zero. An attempted old ESLint parser version conflicted with TypeScript 5.9 and was rejected; no forced peer-dependency bypass was used.
- Initial JSX brace and test storage-type errors were corrected; typecheck/lint/build then passed.
- The first full Playwright run had two 45-second failures at an exact nested-label locator. The accessible control roles/names were present; corrected role/name locators passed the complete flow on both viewports. No assertion or core behavior was removed.
- Screenshot review led to corrected mobile decorative artwork framing and query-aware navigation selection.
- Final code review tightened idempotency after failed requests and removed a contradictory HTML character-count password minimum; the matching database and expanded eight-scenario browser regressions passed.
- Final local preview verification found the old foundation process still holding port 8080. The cleanup comparison had not normalized Windows slash styles. Its exact project path was verified, the process replaced, and final assets/readiness rechecked successfully.

## Execution boundaries

The integration test fixture refuses database names that do not end in `_test`, creates a unique schema per case and removes that schema afterward. Browser/smoke tests use isolated eneba_e2e_test, not the development or public database. Test data includes only example.com accounts and fake keys.

CI in `.github/workflows/ci.yml` was executed remotely and passed for the runtime source revision linked above. Public-app HTTPS cookies, live persistence and deployed fresh-browser evaluation remain unverified until deployment exists. No coverage percentage, real payment, real activation, email delivery or real sales/rating claim is made.
