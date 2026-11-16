param([Parameter(Mandatory=$true)][string]$SessionPath,[int]$DurationMinutes=120,[string]$OutputName='implementation',[string]$ExpectedPromptFragment='Begin with M0')
$ErrorActionPreference='Stop'
$end=(Get-Date).AddMinutes($DurationMinutes)
$lastLength=-1
while((Get-Date) -lt $end){
  $length=(Get-Item -LiteralPath $SessionPath).Length
  if($length -ne $lastLength){
    try { & "$PSScriptRoot/export-history.ps1" -SessionPath $SessionPath -OutputName $OutputName -ExpectedPromptFragment $ExpectedPromptFragment; $lastLength=$length }
    catch { Write-Output 'History snapshot postponed; source may be mid-write.' }
  }
  Start-Sleep -Seconds 10
}
