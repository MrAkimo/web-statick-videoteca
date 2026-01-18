# Comando para ejecutar
# powershell -ExecutionPolicy Bypass -File tools/make-thumbs.ps1 -InputDir "I:\Mi unidad\Clases de baile" -Crop16x9
param(
  [Parameter(Mandatory=$true)]
  [string]$InputDir,

  [string]$OutputDir = "assets/thumbs",

  # Tiempo donde capturar (primer segundo suele evitar negro)
  [string]$Time = "00:00:01",

  # Ancho final (alto se calcula manteniendo ratio)
  [int]$Width = 1280,

  # Si quieres forzar 16:9 exacto (recorta centrado)
  [switch]$Crop16x9,

  # Sobrescribir thumbnails existentes
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$dir) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

function Slugify([string]$name) {
  # Quita extensión, normaliza y deja algo tipo "taller-bachata-2026-01-10"
  $base = [System.IO.Path]::GetFileNameWithoutExtension($name)
  $s = $base.ToLowerInvariant()

  # Reemplaza espacios y separadores por guiones
  $s = $s -replace "[\s_]+", "-"
  # Quita caracteres raros (deja letras, números y guiones)
  $s = $s -replace "[^a-z0-9\-]", ""
  # Colapsa guiones múltiples
  $s = $s -replace "\-+", "-"
  # Trim guiones
  $s = $s.Trim("-")
  return $s
}

# Verifica ffmpeg
try {
  & "C:\ffmpeg\bin\ffmpeg.exe" -version | Out-Null
} catch {
  throw "No encuentro ffmpeg. Instálalo y añade ffmpeg al PATH."
}

Ensure-Dir $OutputDir

$exts = @("*.mp4","*.mov","*.mkv","*.m4v","*.webm","*.avi")
$files = @()
foreach($e in $exts){
  $files += Get-ChildItem -Path $InputDir -Recurse -File -Filter $e -ErrorAction SilentlyContinue |
    Where-Object {
      # Ignora carpetas que empiecen por "_"
      $_.FullName -notmatch "\\_"
    }
}

if ($files.Count -eq 0) {
  Write-Host "No encontré vídeos en: $InputDir"
  exit 0
}

Write-Host "Encontrados $($files.Count) videos."
Write-Host "Salida: $OutputDir"
Write-Host "Tiempo captura: $Time"
Write-Host "Width: $Width  Crop16x9: $Crop16x9  Force: $Force"
Write-Host ""

foreach($f in $files){
  $slug = Slugify $f.Name
  $out = Join-Path $OutputDir ($slug + ".jpg")

  if ((Test-Path $out) -and (-not $Force)) {
    Write-Host "SKIP (existe): $out"
    continue
  }

  # Filtros de video
  # - scale a width fijo
  # - (opcional) crop centrado a 16:9 exacto
  $vf = "scale=${Width:-2}"

  if ($Crop16x9) {
    # Primero escala para asegurar ancho, luego recorta a 16:9 exacto (centrado)
    # crop = ancho : alto
    $vf = "scale=${Width:-2,crop=iw:iw*9/16}"
  }

  Write-Host "THUMB -> $($f.FullName)"
  Write-Host "        $out"

  # -ss ANTES de -i es más rápido; para precisión total puede ir después,
  # pero para thumbs normalmente va perfecto así.
  & "C:\ffmpeg\bin\ffmpeg.exe"`
    -hide_banner -loglevel error `
    -ss $Time `
    -i $f.FullName `
    -frames:v 1 `
    -q:v 2 `
    -vf $vf `
    -y $out

  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR con: $($f.FullName)"
  }
}

Write-Host ""
Write-Host "Listo. Thumbnails generados en: $OutputDir"