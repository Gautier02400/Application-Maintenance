# maj-version.ps1 : augmente le numéro de version du cache dans sw.js (v56 -> v57...).
# À lancer après CHAQUE modification de l'appli, avant le commit :
#   clic droit sur ce fichier > "Exécuter avec PowerShell"   (ou dans un terminal :  powershell -ExecutionPolicy Bypass -File maj-version.ps1)
# Les appareils verront alors le bandeau "Nouvelle version disponible".

$sw = Join-Path $PSScriptRoot 'sw.js'
$txt = [IO.File]::ReadAllText($sw)
$m = [regex]::Match($txt, "const CACHE = 'tutos-maintenance-v(\d+)';")
if (-not $m.Success) { Write-Host "Numero de version introuvable dans sw.js" -ForegroundColor Red; exit 1 }
$old = [int]$m.Groups[1].Value
$new = $old + 1
$txt = $txt.Replace($m.Value, "const CACHE = 'tutos-maintenance-v$new';")
[IO.File]::WriteAllText($sw, $txt, (New-Object Text.UTF8Encoding($false)))   # UTF-8 sans BOM, comme avant
Write-Host "Version du cache : v$old -> v$new" -ForegroundColor Green
