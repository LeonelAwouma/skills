<#
.SYNOPSIS
  Installs the celeste-video skill for Claude Code (Windows 11 / PowerShell 5.1+ / PowerShell 7).

.DESCRIPTION
  Copies the skill folder; it never installs software system-wide and never touches other skills.
    -Scope project : <project>\.claude\skills\celeste-video   (default; current folder or -Project)
    -Scope user    : %USERPROFILE%\.claude\skills\celeste-video (all projects)
  Run it from the unzipped package (it installs the folder it lives in) or pass -Source.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install\install.ps1 -Scope project -Project C:\work\my-video
  powershell -ExecutionPolicy Bypass -File install\install.ps1 -Scope user
#>
param(
  [ValidateSet("project", "user")] [string] $Scope = "project",
  [string] $Project = (Get-Location).Path,
  [string] $Source = (Split-Path -Parent $PSScriptRoot),
  [string] $SkillsRoot,          # override of the target skills folder (tests, custom setups)
  [switch] $Force
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path (Join-Path $Source "SKILL.md"))) { throw "SKILL.md not found in $Source. Run this script from the unzipped celeste-video folder or pass -Source." }

if ($SkillsRoot) { $root = $SkillsRoot }
elseif ($Scope -eq "user") { $root = Join-Path $env:USERPROFILE ".claude\skills" }
else { $root = Join-Path $Project ".claude\skills" }
$dest = Join-Path $root "celeste-video"

if ((Test-Path $dest) -and -not $Force) {
  if ((Resolve-Path $dest).Path -eq (Resolve-Path $Source).Path) { Write-Host "Already installed at $dest (this is the source)."; exit 0 }
  throw "$dest already exists. Re-run with -Force to replace it (it will be overwritten)."
}

$skip = @("node_modules", ".cv", "out", "__pycache__", ".venv", ".venv-piper", "venv", "voices")
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-ChildItem -Path $Source -Force | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
}
Get-ChildItem -Path $dest -Recurse -Force -Directory -Include "__pycache__", "node_modules" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Installed: $dest"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Node.js 20+ was not found. Install it (winget install OpenJS.NodeJS.LTS), reopen the terminal, then run:"
  Write-Host "  node `"$dest\scripts\cv.mjs`" doctor"
} else {
  Write-Host "`nEnvironment check (read-only):"
  & node (Join-Path $dest "scripts\cv.mjs") doctor --project $Project
}
Write-Host "`nNext: open Claude Code in your project and type  /celeste-video <what you want>"
Write-Host "      (if the skills folder is new, run /reload-skills once)"
