# Publica la app en GitHub Pages
# Uso: pwsh -File scripts/deploy-pages.ps1
#
# Requiere en .env.local:  GITHUB_TOKEN=ghp_...
# Genera el sitio estático en out/ y lo sube a la rama gh-pages.

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

# --- token ---
$token = $null
if (Test-Path ".env.local") {
  foreach ($linea in Get-Content ".env.local") {
    if ($linea -match '^\s*GITHUB_TOKEN\s*=\s*(.+)$') { $token = $matches[1].Trim() }
  }
}
if (-not $token) { throw "Falta GITHUB_TOKEN en .env.local" }

# --- git portable ---
$git = Join-Path $raiz ".tools\mingit\cmd\git.exe"
if (-not (Test-Path $git)) { throw "No se encontro git portable en .tools\mingit" }

# --- build estatico ---
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $node = "C:\Users\Cesar Chunga\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
}
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:GH_PAGES = "1"

if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
& $node "node_modules\next\dist\bin\next" build
if ($LASTEXITCODE -ne 0) { throw "Fallo el build" }

# --- .nojekyll (sin esto GitHub Pages ignora la carpeta _next) ---
Set-Content -Path "out\.nojekyll" -Value "" -NoNewline -Encoding ascii

# --- copiar a .deploy ---
$destino = Join-Path $raiz ".deploy"
if (Test-Path $destino) { Remove-Item -Recurse -Force $destino }
New-Item -ItemType Directory -Path $destino | Out-Null
robocopy (Join-Path $raiz "out") $destino /E /NFL /NDL /NJH /NJS /NP | Out-Null

# --- publicar ---
Push-Location $destino
try {
  if (-not (Test-Path ".git")) { & $git init -b gh-pages | Out-Null }
  & $git config user.name "MIMIPASTEL"
  & $git config user.email "admin@mimipastel.pe"
  & $git add -A
  $fecha = Get-Date -Format "yyyy-MM-dd HH:mm"
  & $git commit -m "Publicacion $fecha" --allow-empty | Out-Null
  & $git push -f "https://x-access-token:$token@github.com/MIMIPASTEL/MIMI-PASTEL.git" gh-pages
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Listo: https://mimipastel.github.io/MIMI-PASTEL/" -ForegroundColor Green
