param([Parameter(Mandatory=$true)][string]$SessionPath,[int]$DurationMinutes=120,[string]$OutputName='implementation',[string]$ExpectedPromptFragment='Begin with M0')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$disabledMarker=Join-Path $root '.private/history-capture-disabled'
if(Test-Path -LiteralPath $disabledMarker){Write-Output 'History capture is disabled; watcher not started.';return}
$end=(Get-Date).AddMinutes($DurationMinutes)
$lastLength=-1
while((Get-Date) -lt $end){
  if(Test-Path -LiteralPath $disabledMarker){Write-Output 'History capture disabled; watcher stopped.';break}
  $length=(Get-Item -LiteralPath $SessionPath).Length
  if($length -ne $lastLength){
    try { & "$PSScriptRoot/export-history.ps1" -SessionPath $SessionPath -OutputName $OutputName -ExpectedPromptFragment $ExpectedPromptFragment; $lastLength=$length }
    catch { Write-Output 'History snapshot postponed; source may be mid-write.' }
  }
  Start-Sleep -Seconds 10
}
