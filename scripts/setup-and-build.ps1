$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

Write-Host "Installation des dépendances Facturette..."
npm install

Write-Host "Compilation de Facturette.exe..."
npm run dist

Write-Host "Création du raccourci Bureau..."
npm run make-shortcut

Write-Host ""
Write-Host "Terminé. Facturette.exe est disponible dans le dossier dist, avec un raccourci sur le Bureau."
