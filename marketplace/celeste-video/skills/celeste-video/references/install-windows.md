# Installation guide (Windows 11)

Two parts: the **plugin** (this skill: instructions only) and the **engine** (the open-source tool that renders). Full engine reference: `ENGINE.md` at the plugin root.

## 0. Prerequisites

| Need | Check | Install |
| --- | --- | --- |
| Claude Code | `claude --version` | https://claude.com/claude-code |
| Git | `git --version` | `winget install Git.Git` |
| Node.js 20+ (with npm) | `node -v` | `winget install OpenJS.NodeJS.LTS` |
| Python 3.10-3.13 (only for narration) | `py --version` | `winget install Python.Python.3.12` |
| FFmpeg | nothing to do | bundled by Remotion (`npm install`); a system FFmpeg is used if present |
| Playwright (only for captures) | - | `npm install --save-dev playwright-core` in the project |
| Free RAM | `node <ENGINE_DIR>\scripts\cv.mjs doctor` | renders need ~1.6 GB free; close heavy apps otherwise |

Disk: Remotion + Chrome headless ~700 MB per project, Piper venv ~170 MB and each voice 60-80 MB (shared, in `%USERPROFILE%\.celeste-video`).

## 1. Install the plugin

Install `celeste-video` from the Claude plugin directory with `/plugin` in Claude Code, then restart Claude Code if `/celeste-video` does not appear in autocomplete.

## 2. Install the engine (once)

```powershell
git clone https://github.com/LeonelAwouma/skills.git $env:USERPROFILE\celeste-video-engine
node $env:USERPROFILE\celeste-video-engine\skills\celeste-video\scripts\cv.mjs doctor
```

`<ENGINE_DIR>` is then `%USERPROFILE%\celeste-video-engine\skills\celeste-video`, the folder the skill looks in first. Another folder works: tell Claude where it is. Do not copy the engine into `.claude\skills` (its own `SKILL.md` would clash with the plugin's skill of the same name).

## 3. First run in a new project

```
/celeste-video Crée une publicité de 30 secondes pour <mon entreprise>, avec voix off française, animations modernes, musique, sous-titres et export MP4.
```
Claude locates the engine, proposes `cv doctor`, asks before installing anything (Remotion in the project, Piper + a voice), writes the storyboard, builds and renders with the memory protocol. Each command goes through Claude Code's permission prompt.

Manual equivalent (PowerShell, from the project folder; `CV` = `node <ENGINE_DIR>\scripts\cv.mjs`):
```
CV doctor
CV init . --template ad              # engine project + video\storyboard.json, npm install
CV voice setup --yes                 # Piper venv + fr_FR-upmc-medium (~250 MB)
CV storyboard validate
CV build
CV still 30,150,400 --short-side 540 # review images in out\stills
CV render                            # out\<slug>-9x16.mp4, verified
```

## 4. Uninstall

Plugin: `/plugin` -> uninstall `celeste-video`. Engine: delete the clone folder. Optional cleanup: `%USERPROFILE%\.celeste-video` (Piper + voices), a project's `node_modules`, `.cv`, `out`.

## 5. Offline / corporate networks

First use needs internet for: `git clone`, `npm install`, Chrome Headless Shell, Google Fonts (first render), Piper (`pip`) and voice models. After that renders work offline except for fonts not yet cached.

## 6. Updating

Plugin: updated through `/plugin`. Engine: `git pull` in the clone. In projects: `cv init . --upgrade` refreshes `src/engine`, `components`, `scenes`, `design` (your `video/` folder, `cv.config.json` and `package.json` are never overwritten).
