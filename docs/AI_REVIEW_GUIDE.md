# AI-assisted development: reviewer reading guide

This is a curated navigation aid, not an edited transcript or a substitute for the required full prompts and responses. The original implementation snapshot is preserved. The earlier planning conversation remains missing as described in [AI_HISTORY.md](AI_HISTORY.md).

## Suggested starting points

| Topic | Where to read | What the record shows |
| --- | --- | --- |
| Task delegation and constraints | [Original implementation request, message 2](ai-history/implementation.md#2-user), [build brief](Eneba_Codex_Build_Prompt.md) | Scope, original requirements, agent responsibilities, explanation and verification expectations |
| Checkout correctness | [Message 7](ai-history/implementation.md#7-assistant), [message 12](ai-history/implementation.md#12-assistant), [API/schema](API.md) | Selected seller identity, server-side pricing, transactions, contention and idempotent retries |
| Dependency and test review | [Message 8](ai-history/implementation.md#8-assistant), [message 13](ai-history/implementation.md#13-assistant), [test results](TEST_RESULTS.md) | Audit findings, fixes and checks recorded with execution limits |
| Responding to failures | [Message 15](ai-history/implementation.md#15-assistant), [message 31](ai-history/implementation.md#31-assistant), [message 32](ai-history/implementation.md#32-assistant) | Browser selector corrections, search fallback checks and stale local-server diagnosis |
| Publication and privacy | [Message 17](ai-history/implementation.md#17-user), [message 29](ai-history/implementation.md#29-assistant) | User publication decision and privacy review before the public source push |
| Deployed behavior | [Message 44](ai-history/implementation.md#44-assistant), [message 45](ai-history/implementation.md#45-assistant), [message 47](ai-history/implementation.md#47-assistant) | Live typo search, public browser checks and order/key persistence after a restart |

## Evaluation context

The assistant wrote implementation code and recorded verification results under the user's instructions. These messages do not establish that the user wrote every function unaided. Setup questions, access problems, failed attempts and corrections remain in the original sequence so the collaboration can be evaluated accurately.

For a quick product walkthrough use [DEMO.md](DEMO.md). For design choices use [DECISIONS.md](DECISIONS.md). Historical test claims are documented in [TEST_RESULTS.md](TEST_RESULTS.md); this guide introduces no new test run or completeness claim.
