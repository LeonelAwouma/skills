# Installation guide (Windows 11)

## 0. Prerequisites

| Need | Check | Install |
| --- | --- | --- |
| Claude Code | `claude --version` | https://claude.com/claude-code |
| Node.js 20+ (with npm) | `node -v` | `winget install OpenJS.NodeJS.LTS` |
| Python 3.10-3.13 (only for narration) | `py --version` | `winget install Python.Python.3.12` |
| FFmpeg | nothing to do | bundled by Remotion (`npm install`); a system FFmpeg is used if present |
| Playwright (only for captures) | - | `npm install --save-dev playwright-core` in the project |
| Free RAM | `node <skill>\scripts\cv.mjs doctor` | renders need ~1.6 GB free; close heavy apps otherwise |

Disk: Remotion + Chrome headless ~700 MB per project, Piper venv ~170 MB and each voice 60-80 MB (shared, in `%USERPROFILE%\.celeste-video`).

## 1. Install the skill (choose one)

**A. From the ZIP (recommended)**
```powershell
Expand-Archive celeste-video-skill.zip -DestinationPath $env:TEMP\cv
# per project:
powershell -ExecutionPolicy Bypass -File $env:TEMP\cv\celeste-video\install\install.ps1 -Scope project -Project C:\work\my-video
# or for every project of your user:
powershell -ExecutionPolicy Bypass -File $env:TEMP\cv\celeste-video\install\install.ps1 -Scope user
```
**B. By hand**: copy the `celeste-video` folder to `<project>\.claude\skills\celeste-video\` (project) or `%USERPROFILE%\.claude\skills\celeste-video\` (personal). Skills are discovered from these two folders; project skills override personal ones with the same name.

Then open Claude Code in your project folder. If `.claude\skills` is new, run `/reload-skills` once. Type `/celeste-video` (autocomplete shows it).

## 2. First run in a new project

```
/celeste-video Crée une publicité de 30 secondes pour <mon entreprise>, avec voix off française, animations modernes, musique, sous-titres et export MP4.
```
Claude will run `cv doctor`, ask before installing anything (Remotion in the project, Piper + a voice), write the storyboard, build and render with the memory protocol.

Manual equivalent (PowerShell, from the project folder; `CV` = `node <skill>\scripts\cv.mjs`):
```
CV doctor
CV init . --template ad              # engine + video\storyboard.json, npm install (asks nothing: you ran it)
CV voice setup --yes                 # Piper venv + fr_FR-upmc-medium (~250 MB)
CV storyboard validate
CV build
CV still 30,150,400 --short-side 540 # review images in out\stills
CV render                            # out\<slug>-9x16.mp4, verified
```

## 3. Uninstall

Delete the `celeste-video` folder from `.claude\skills`. Optional cleanup: `%USERPROFILE%\.celeste-video` (Piper + voices), a project's `node_modules`, `.cv`, `out`.

## 4. Offline / corporate networks

First use needs internet for: `npm install`, Chrome Headless Shell, Google Fonts (first render), Piper (`pip`) and voice models. After that renders work offline except for fonts not yet cached.

## 5. Updating

Replace the skill folder with a newer one. In projects: `cv init . --upgrade` refreshes `src/engine`, `components`, `scenes`, `design` (your `video/` folder, `cv.config.json` and `package.json` are never overwritten).
