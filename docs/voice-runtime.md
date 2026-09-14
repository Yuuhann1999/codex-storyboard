# Voice Runtime

Only VoxCPM is supported. Voice generation sends dialogue text to the online
VoxCPM Gradio service after the user confirms it. No keys are read from other apps.

Requirements: Python 3.10+, gradio_client, FFmpeg, FFprobe, Whisper.cpp and a local
Whisper model. Dependencies are never
installed implicitly. A dedicated Python virtual environment is recommended:

```powershell
python -m venv .venv-voice
.\.venv-voice\Scripts\python.exe -m pip install -r voice/requirements.txt
$env:CODEX_STORYBOARD_PYTHON = (Resolve-Path .venv-voice\Scripts\python.exe).Path
npm start
```

Optional absolute executable paths: CODEX_STORYBOARD_FFMPEG,
CODEX_STORYBOARD_FFPROBE, CODEX_STORYBOARD_WHISPER,
CODEX_STORYBOARD_WHISPER_MODEL. Arguments are passed without a shell on Windows and Unix.
Generated versions remain in the project media folder. Interrupted jobs can be
retried after restarting. Existing versions are retained on failure.

The actual DSH VoxCPM runner is vendored at `voice/vendor/voxcpm_tts.py`, with its
MIT license. The JSON bridge avoids Windows command-line length and quoting
issues. Runtime auto-pip installation is disabled; dependencies are isolated in
the voice virtual environment. No CosyVoice or DashScope code is included.

## Local model

The tested Windows runtime uses Whisper.cpp v1.9.2 CPU binaries and the multilingual
large-v3-turbo Q5_0 model (574,041,195 bytes). Audio recognition runs locally, without
uploading audio or text to a recognition service. CPU recognition is slower than
GPU inference; a 30-minute timeout applies. Missing models fail explicitly; the app
does not silently substitute the old character-weight estimate.

Default development layout (ignored by Git):

```text
.venv-voice/Scripts/python.exe
.runtime-voice/ffmpeg/bin/ffmpeg.exe
.runtime-voice/ffmpeg/bin/ffprobe.exe
.runtime-voice/whisper/whisper-cli.exe   (+ bundled DLLs)
.runtime-voice/ggml-large-v3-turbo-q5_0.bin
```

Whisper binaries: https://github.com/ggml-org/whisper.cpp/releases/tag/v1.9.2

Model: https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-large-v3-turbo-q5_0.bin

Tested model SHA256: `394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2`.
`CODEX_STORYBOARD_RUNTIME` can point to a shared runtime directory for the installed
plugin. Set `CODEX_STORYBOARD_PYTHON` separately when sharing the virtual environment.

## Alignment

Whisper supplies recognized text and token timestamps. Sequence alignment maps
recognized characters to the ordered shot dialogue, tolerating punctuation and
some recognition errors. Insufficient matches are rejected. Original recognition
text is retained for inspection. Timing within multi-character tokens is
interpolated; this is recognition-assisted alignment, not guaranteed phoneme-level
forced alignment. Boundaries can be reviewed and adjusted before applying them.
A dialogue fingerprint rejects stale timing after edits or
reordering. Non-speaking shots keep their existing duration; their extra time is
not automatically inserted as silence in the audio. This is not a final video mix.

## Development checks

Run `npm test` and `npm run check`. Tests use temporary projects and never modify
the user's data. Plugin parity tests ensure the bundled app matches development.
Real online synthesis needs the dependencies above and network access; offline
tests validate the queue, failure recovery and timing math, not voice quality.

Run `node scripts/voice-smoke.mjs` against the running development app for a live
test. This explicitly sends synthetic test dialogue to VoxCPM, creates a test
project, runs local recognition, applies durations, and verifies stale timing is
rejected. It retains the test project and audio for manual playback.
