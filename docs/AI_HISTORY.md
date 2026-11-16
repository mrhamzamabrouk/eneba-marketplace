# AI history and completeness

Status: INCOMPLETE until every assignment session is verified. This index and decision summaries are not substitutes for full prompts and responses.

## Current implementation session

The original Codex JSONL rollout was verified against the exact implementation request and the first three assistant messages. [Current implementation transcript](ai-history/implementation.md) is exported by scripts/export-history.ps1, preserving original user prompts and public assistant responses. Tool records, system/developer instructions and internal reasoning are excluded. No messages are reconstructed. The original is copied privately to the ignored .private directory.

scripts/watch-history.ps1 can refresh the export every ten seconds for a bounded two-hour run, including the eventual final response if the host writes it during that period. Check the transcript after the response rather than assuming it was captured. Re-run export-history.ps1 with the original session path if the watcher has stopped. A final original message absent from the Markdown is still a missing segment.

Submission copies explicitly redact local machine paths and unrelated saved GitHub account labels. The original remains unchanged privately. Secrets/tool records and internal reasoning are not included. A public GitHub snapshot cannot contain messages written after that commit; review and commit the refreshed transcript before submission.

For each new session use a distinct `-OutputName` (for example `deployment`) and an `-ExpectedPromptFragment` verified against that session's actual user request. The exporter refuses to overwrite another session's output. Add its Markdown link here and retain all previous exports. Current implementation output is `implementation.md`.

## Missing history

The earlier planning conversation mentioned by the build prompt has not been provided. Keep it explicitly missing. For a personal ChatGPT account: profile > Settings > Data controls > Export data > Export > Confirm export. Download the delivered archive privately, locate the assignment planning conversation, and supply its original full prompts and responses or an accessible full conversation share link. For an organization-managed workspace ask the workspace owner for the available data-access route. Verify the contents: an export request alone is not evidence of completeness.

Official instructions: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data

Never commit a whole account export. Store only this assignment's reviewed submission transcript in docs/ai-history. Clearly mark any required secret redaction. A missing segment must stay marked, never reconstructed from memory.
