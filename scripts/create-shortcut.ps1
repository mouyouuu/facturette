$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ExePath = Join-Path $ProjectRoot "dist\Facturette.exe"
$SourceIconPath = Join-Path $ProjectRoot "build\icon.ico"
$DistIconPath = Join-Path $ProjectRoot "dist\Facturette.ico"

if (-not (Test-Path $ExePath)) {
  throw "Facturette.exe introuvable : $ExePath"
}

if (Test-Path $SourceIconPath) {
  Copy-Item -LiteralPath $SourceIconPath -Destination $DistIconPath -Force
}

function New-FacturetteShortcut {
  param(
    [string] $ShortcutPath
  )

  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $ExePath
  $Shortcut.WorkingDirectory = Split-Path -Parent $ExePath
  $Shortcut.IconLocation = if (Test-Path $DistIconPath) { "$DistIconPath,0" } else { "$ExePath,0" }
  $Shortcut.Description = "Logiciel de facturation local Facturette"
  $Shortcut.Save()
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Facturette.lnk"
New-FacturetteShortcut -ShortcutPath $ShortcutPath

$StartMenuPrograms = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$StartMenuShortcutPath = Join-Path $StartMenuPrograms "Facturette.lnk"
New-FacturetteShortcut -ShortcutPath $StartMenuShortcutPath

if (Get-Command ie4uinit.exe -ErrorAction SilentlyContinue) {
  & ie4uinit.exe -show
}

Write-Host "Raccourci créé : $ShortcutPath"
Write-Host "Raccourci menu Démarrer créé : $StartMenuShortcutPath"
