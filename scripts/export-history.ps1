param([string]$SessionPath)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $SessionPath) { throw 'Pass the exact verified original rollout path with -SessionPath.' }
$raw = Get-Content -LiteralPath $SessionPath -Encoding UTF8
if (-not ($raw | Select-String -SimpleMatch 'Begin with M0')) { throw 'This log does not contain the assignment request.' }
New-Item -ItemType Directory -Path "$root/.private","$root/docs/ai-history" -Force | Out-Null
Copy-Item -LiteralPath $SessionPath -Destination "$root/.private/implementation-original.jsonl"
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Original implementation conversation export')
$lines.Add('')
$lines.Add('Snapshot of public user prompts and assistant responses from the original Codex rollout. Tool records, system/developer instructions and internal reasoning are excluded. Earlier planning is missing. Refresh after the session ends to include the final reply.')
$lines.Add('')
$count = 0
foreach ($line in $raw) {
  $entry = $line | ConvertFrom-Json
  if ($entry.type -ne 'response_item' -or $entry.payload.type -ne 'message') { continue }
  $msg = $entry.payload
  if ($msg.role -notin @('user','assistant') -or $msg.channel -eq 'analysis') { continue }
  $body = ($msg.content | ForEach-Object { if ($_.type -in @('input_text','output_text','text')) { $_.text } }) -join "`n"
  if (-not $body) { continue }
  $count++
  $lines.Add("## $count. $($msg.role)")
  $lines.Add('')
  $lines.Add($body)
  $lines.Add('')
}
$lines | Set-Content -LiteralPath "$root/docs/ai-history/implementation.md" -Encoding UTF8
Write-Output "Exported $count original public messages. Earlier planning and future messages remain outstanding."
