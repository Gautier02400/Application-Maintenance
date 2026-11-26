# maj-version.ps1 : augmente le numéro de version (v67 -> v68...) dans sw.js ET dans app.js.
# À lancer après CHAQUE modification de l'appli, avant l'envoi sur GitHub :
#   clic droit sur ce fichier > "Exécuter avec PowerShell"   (ou dans un terminal :  powershell -ExecutionPolicy Bypass -File maj-version.ps1)
# sw.js  : les appareils verront le bandeau "Nouvelle version disponible".
# app.js : les modèles 3D sont rechargés tout de suite (sinon GitHub les garde 10 min en cache).

$sw = Join-Path $PSScriptRoot 'sw.js'
$app = Join-Path $PSScriptRoot 'app.js'
$utf8 = New-Object Text.UTF8Encoding($false)
$txt = [IO.File]::ReadAllText($sw)
$m = [regex]::Match($txt, "const CACHE = 'tutos-maintenance-v(\d+)';")
if (-not $m.Success) { Write-Host "Numero de version introuvable dans sw.js" -ForegroundColor Red; exit 1 }
$old = [int]$m.Groups[1].Value
$new = $old + 1
$txt = $txt.Replace($m.Value, "const CACHE = 'tutos-maintenance-v$new';")
[IO.File]::WriteAllText($sw, $txt, $utf8)
$a = [IO.File]::ReadAllText($app)
$a2 = [regex]::Replace($a, "const APP_VER = 'v\d+';", "const APP_VER = 'v$new';")
if ($a2 -ne $a) { [IO.File]::WriteAllText($app, $a2, $utf8) }
Write-Host "Version : v$old -> v$new (sw.js et app.js)" -ForegroundColor Green
