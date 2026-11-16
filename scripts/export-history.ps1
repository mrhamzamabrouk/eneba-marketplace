param([string]$SessionPath,[string]$OutputName='implementation',[string]$ExpectedPromptFragment='Begin with M0')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $SessionPath) { throw 'Pass the exact verified original rollout path with -SessionPath.' }
if ($OutputName -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Use a simple distinct output name for each session.' }
if (-not $ExpectedPromptFragment -or -not (Select-String -LiteralPath $SessionPath -SimpleMatch $ExpectedPromptFragment -Quiet)) { throw 'This log does not contain the verified assignment prompt fragment.' }
New-Item -ItemType Directory -Path "$root/.private","$root/docs/ai-history" -Force | Out-Null
$sourceMarker="$root/.private/$OutputName-source.txt"
if((Test-Path -LiteralPath $sourceMarker) -and (Get-Content -LiteralPath $sourceMarker -Raw).Trim() -ne $SessionPath){throw 'This output belongs to another session. Choose a distinct -OutputName and update AI_HISTORY.md.'}
$SessionPath | Set-Content -LiteralPath $sourceMarker
Copy-Item -LiteralPath $SessionPath -Destination "$root/.private/$OutputName-original.jsonl"
$raw = Get-Content -LiteralPath "$root/.private/$OutputName-original.jsonl" -Encoding UTF8
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Original implementation conversation export')
$lines.Add('')
$lines.Add('Snapshot of public user prompts and assistant responses from the original Codex rollout. Tool records, system/developer instructions and internal reasoning are excluded. Earlier planning is missing. Refresh after the session ends to include the final reply.')
$lines.Add('Submission privacy redactions are explicitly marked: local machine paths and unrelated saved GitHub account labels. The private original remains unchanged. No missing message is reconstructed.')
$lines.Add('')
$count = 0
foreach ($line in $raw) {
  $entry = $line | ConvertFrom-Json
  if ($entry.type -ne 'response_item' -or $entry.payload.type -ne 'message') { continue }
  $msg = $entry.payload
  if ($msg.role -notin @('user','assistant') -or $msg.channel -eq 'analysis') { continue }
  $body = ($msg.content | ForEach-Object { if ($_.type -in @('input_text','output_text','text')) { $_.text } }) -join "`n"
  if (-not $body) { continue }
  $body=$body -ireplace [regex]::Escape($root),'[PRIVACY REDACTION: local workspace path]'
  $body=$body -ireplace [regex]::Escape($root.Replace('\','\\')),'[PRIVACY REDACTION: local workspace path]'
  $redactionFile="$root/.private/history-redactions.json"
  if(Test-Path -LiteralPath $redactionFile){
    $redactions=Get-Content -LiteralPath $redactionFile -Raw | ConvertFrom-Json
    foreach($label in $redactions.labels){if($label){$body=$body.Replace($label,'[PRIVACY REDACTION: unrelated saved GitHub account]')}}
  }
  $count++
  $lines.Add("## $count. $($msg.role)")
  $lines.Add('')
  $lines.Add($body)
  $lines.Add('')
}
[System.IO.File]::WriteAllText("$root/docs/ai-history/$OutputName.md",(($lines -join "`n").TrimEnd()+"`n"))
Write-Output "Exported $count original public messages. Earlier planning and future messages remain outstanding."
