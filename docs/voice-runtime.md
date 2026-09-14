# Voice Runtime

Only VoxCPM is supported. Voice generation sends dialogue text to the online
VoxCPM Gradio service after the user confirms it. No keys are read from other apps.

Requirements: Python 3.10+, gradio_client, FFmpeg and FFprobe. Dependencies are never
installed implicitly. A dedicated Python virtual environment is recommended:

```powershell
python -m venv .venv-voice
.\.venv-voice\Scripts\python.exe -m pip install gradio_client
$env:CODEX_STORYBOARD_PYTHON = (Resolve-Path .venv-voice\Scripts\python.exe).Path
npm start
```

Optional absolute executable paths: CODEX_STORYBOARD_FFMPEG,
CODEX_STORYBOARD_FFPROBE. Arguments are passed without a shell on Windows and Unix.
Generated versions remain in the project media folder. Interrupted jobs can be
retried after restarting. Existing versions are retained on failure.

The interaction and Gradio request contract were informed by the local
dsh-storyboard implementation. No CosyVoice or DashScope code is included.
