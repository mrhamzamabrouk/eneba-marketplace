# AI history and completeness

Status: INCOMPLETE until every assignment session is verified. This index and decision summaries are not substitutes for full prompts and responses.

## Current implementation session

A local original Codex JSONL rollout was found under the user's .codex/sessions directory. It must be verified against this user's exact implementation request before exporting. Export only user prompts and public assistant messages; do not publish system/developer instructions, hidden reasoning, credentials, or unrelated conversations. Retain the original privately in the ignored .private directory. Refresh the Markdown export after the final response because a running session cannot contain its future messages.

## Missing history

The earlier planning conversation mentioned by the build prompt has not been provided. Keep it explicitly missing. For a personal ChatGPT account: profile > Settings > Data controls > Export data > Export > Confirm export. Download the delivered archive privately, locate the assignment planning conversation, and supply its original full prompts and responses or an accessible full conversation share link. For an organization-managed workspace ask the workspace owner for the available data-access route. Verify the contents: an export request alone is not evidence of completeness.

Official instructions: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data

Never commit a whole account export. Store only this assignment's reviewed submission transcript in docs/ai-history. Clearly mark any required secret redaction. A missing segment must stay marked, never reconstructed from memory.
