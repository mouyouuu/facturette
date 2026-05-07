$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root

try {
  $tree = (git rev-parse HEAD:pwa).Trim()
  $commit = (git commit-tree $tree -m "Deploy PWA").Trim()
  git push origin "$commit`:refs/heads/gh-pages" --force
  Write-Output "PWA publiee sur la branche gh-pages: $commit"
} finally {
  Pop-Location
}
