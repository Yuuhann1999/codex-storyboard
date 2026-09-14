"""VoxCPM Gradio bridge. No implicit package installation or shell commands."""
import json
import shutil
import sys
from pathlib import Path

if sys.version_info < (3, 10):
    raise SystemExit("VoxCPM requires Python 3.10+")
try:
    from gradio_client import Client
except ImportError:
    raise SystemExit("Missing gradio_client. Install it in CODEX_STORYBOARD_PYTHON with: python -m pip install gradio_client")

request = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
client = Client("https://voxcpm.modelbest.cn", httpx_kwargs={"timeout": 180})
result = client.predict(
    text=request["text"], control_instruction=request.get("instruction", ""),
    ref_wav=None, use_prompt_text=False, prompt_text_value="",
    cfg_value=2.0, do_normalize=True, denoise=False, dit_steps=10.0,
    user_id="codex-storyboard", api_name="/generate",
)
shutil.copy2(result, request["output"])
