$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Path "$root/.tools" -Force | Out-Null
Push-Location "$root/frontend"
try {
 npm.cmd ci
 if($LASTEXITCODE -ne 0){throw 'npm ci failed'}
 npm.cmd run build
 if($LASTEXITCODE -ne 0){throw 'Frontend build failed'}
} finally {Pop-Location}
Push-Location "$root/backend"
try {
 go build -trimpath -o "$root/.tools/marketplace.exe" .
 if($LASTEXITCODE -ne 0){throw 'Go build failed'}
} finally {Pop-Location}
Write-Output "Production executable: $root/.tools/marketplace.exe"
