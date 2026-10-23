# Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/celeste-video` not listed | skill folder created after the session started | run `/reload-skills`; check the file is `.claude/skills/celeste-video/SKILL.md` (project) or `~/.claude/skills/celeste-video/SKILL.md` (personal) |
| `Remotion is not installed in this project` | no `node_modules` | `cv init .` or `npm install` |
| `Piper TTS is not installed` | no voice environment | ask the user, then `cv voice setup --yes` |
| `pip could not install piper-tts` | Python too new/old for onnxruntime wheels | create the venv from Python 3.11-3.13 and set `CV_PYTHON` |
| `Voice model X is not installed` | model missing | `cv voice setup --yes --voices X` |
| `Voice X is not cleared for commercial use` | licence unclear/unverified | choose a cleared voice, or read the licence (`cv voice info`) and decide with the user; `--accept-licence-risk` is the user's call |
| `Narration overruns the video` | text too long / speed too low | shorten text, raise `speed`, lengthen the scene |
| `moved from A to B to avoid overlapping` | two narration blocks collide | shorten the earlier text or move `at` |
| Odd pronunciation (plural -s, liaison, brand) | eSpeak rules | `--phonemes`, lexicon / `[[ ]]` (`voiceover.md`) |
| `Storyboard is invalid` | see the listed paths | fix JSON; durations must sum to `video.duration` |
| Text cut/overflowing in review frames | line too long for the format | split lines (<= 34 chars), shorten, check `16:9` too |
| Captions over important content | caption band | shorten the visual area or the text; position is `layout.captionTop` in `src/engine/layout.tsx` |
| Fonts differ from the theme | Google Fonts unreachable at render | check internet for the first render; fonts are then cached by Remotion |
| `Not enough free memory` / `stopped by cv because free memory...` | RAM | `render-memory.md`: close apps, retry (resumes), `--short-side 720`, `--chunked` |
| `verified:` missing / `Verification failed` | bad output | read problems; common: storyboard edited during the render, no audio stream |
| Studio/render port conflict | fixed port | `cv render` uses a random free port; for Studio use `npx remotion studio --port 3001` |
| Capture refused | safety rule | read the message: authorization, host, password field |
| `Cannot find module ... generated/...json` | prepare not run | `cv prepare` (or `cv build`) |
| Windows: `npm` not found from cv | PATH | install Node.js with npm; reopen the terminal |
| Weird characters in Python output | cp1252 console | cv sets `PYTHONUTF8=1`; set it yourself when running the script by hand |

Logs: `.cv/logs/cv.log` in the project (every stage, with timestamps). Reports of each render: `.cv/reports/`.
