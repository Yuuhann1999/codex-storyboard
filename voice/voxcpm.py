"""VoxCPM Gradio bridge. No implicit package installation or shell commands."""
import json
import sys
from pathlib import Path

if sys.version_info < (3, 10):
    raise SystemExit("VoxCPM requires Python 3.10+")
try:
    from vendor.voxcpm_tts import generate
except ImportError:
    raise SystemExit("Missing gradio_client. Install it in CODEX_STORYBOARD_PYTHON with: python -m pip install gradio_client")

request = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
generate(
    text=request["text"], output=Path(request["output"]),
    api_base="https://voxcpm.modelbest.cn", instruction=request.get("instruction", ""),
    prompt_wav=None, prompt_text="", cfg=2.0, steps=10,
    normalize=True, denoise=False, user_id="codex-storyboard",
)
