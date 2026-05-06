$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ExePath = Join-Path $ProjectRoot "dist\Facturette.exe"

if (-not (Test-Path $ExePath)) {
  throw "Facturette.exe introuvable : $ExePath"
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Facturette.lnk"
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = Split-Path -Parent $ExePath
$Shortcut.Description = "Logiciel de facturation local Facturette"
$Shortcut.Save()

Write-Host "Raccourci créé : $ShortcutPath"
