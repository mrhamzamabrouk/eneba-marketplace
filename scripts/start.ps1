$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if(Test-Path -LiteralPath "$root/.env"){
 foreach($line in Get-Content -LiteralPath "$root/.env"){
  if($line -match '^([A-Z_]+)=(.*)$'){[Environment]::SetEnvironmentVariable($Matches[1],$Matches[2],'Process')}
 }
}
if(-not $env:DATABASE_URL){throw 'Set DATABASE_URL or create a local .env from .env.example'}
if(-not (Test-Path -LiteralPath "$root/.tools/marketplace.exe")){throw 'Run ./scripts/build.ps1 first'}
& "$root/.tools/marketplace.exe"
