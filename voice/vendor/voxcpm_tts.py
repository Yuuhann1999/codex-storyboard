#!/usr/bin/env python3
"""
VoxCPM TTS Skill — 官方 Gradio API

用法:
  python voxcpm_tts.py "你好，欢迎使用语音合成"
  python voxcpm_tts.py "早间快报" --instruction "中年男性，沉稳专业，播音腔"
  python voxcpm_tts.py "Hello world." -o hello.mp3
  python voxcpm_tts.py "今天天气不错" --prompt ref.wav --prompt-text "参考音频的文字内容"

依赖 (gradio_client) 由分镜台语音环境安装，不在运行时自动安装。
要求: Python >= 3.10
"""

from __future__ import annotations

import argparse
import importlib
import shutil
import sys
from pathlib import Path

# ── 默认配置 ──────────────────────────────────────────────────
DEFAULT_API_BASE = "https://voxcpm.modelbest.cn"
DEFAULT_CFG = 2.0
DEFAULT_STEPS = 10
DEFAULT_OUTPUT = "output.mp3"
SKILL_DIR = Path(__file__).parent
DEFAULT_REF_WAV = SKILL_DIR / "prompt_audio.wav"

# ── 自动安装依赖 ──────────────────────────────────────────────
REQUIRED_PACKAGES = ["gradio_client"]


def _ensure_deps() -> None:
    missing = []
    for pkg in REQUIRED_PACKAGES:
        try:
            importlib.import_module(pkg.replace("-", "_"))
        except ImportError:
            missing.append(pkg)
    if missing:
        raise ImportError(f"Missing dependencies: {', '.join(missing)}. Install them in the configured Python environment.")


_ensure_deps()

from gradio_client import Client, handle_file  # noqa: E402


# ── 核心功能 ──────────────────────────────────────────────────
def generate(
    text: str,
    output: Path,
    api_base: str,
    instruction: str,
    prompt_wav: Path | None,
    prompt_text: str,
    cfg: float,
    steps: int,
    normalize: bool,
    denoise: bool,
    user_id: str,
) -> None:
    use_prompt_text = bool(prompt_wav and prompt_text)

    if use_prompt_text:
        mode = "带文本引导（参考音频 + 文本）"
    elif prompt_wav:
        mode = "参考音色克隆"
    else:
        mode = "纯文字描述（无参考音频）"

    print(f"[VoxCPM] 模式: {mode}")
    print(f"[VoxCPM] 目标文本: {text}")
    if instruction:
        print(f"[VoxCPM] 声音描述: {instruction}")
    print(f"[VoxCPM] CFG: {cfg} | 扩散步数: {steps}")
    print(f"[VoxCPM] 正在连接服务器: {api_base} ...")

    # 生成结果回传可能较慢，避免 Gradio 客户端在下载临时音频时过早超时。
    client = Client(api_base, httpx_kwargs={"timeout": None})

    ref_wav_arg = handle_file(str(prompt_wav)) if prompt_wav else None

    print(f"[VoxCPM] 正在生成语音 → {output} ...")
    result = client.predict(
        text=text,
        control_instruction=instruction,
        ref_wav=ref_wav_arg,
        use_prompt_text=use_prompt_text,
        prompt_text_value=prompt_text,
        cfg_value=cfg,
        do_normalize=normalize,
        denoise=denoise,
        dit_steps=float(steps),
        user_id=user_id,
        api_name="/generate",
    )

    # result 是服务器返回的临时音频文件路径，复制到目标位置
    shutil.copy2(result, output)
    print(f"[VoxCPM] 完成! 文件已保存: {output.resolve()}")


# ── CLI 入口 ──────────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="VoxCPM 语音合成 — 官方 Gradio API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
示例:
  %(prog)s "你好，欢迎使用语音合成"
  %(prog)s "早间快报，沪深两市今日低开高走" --instruction "中年男性，标准普通话，沉稳专业，播音腔"
  %(prog)s "Hello world." -o hello.mp3
  %(prog)s "今天天气不错" --prompt ref.wav --prompt-text "参考音频中说的文字"
  %(prog)s "深夜电台" --instruction "成熟女性，低沉温暖，气声感强" --cfg 3 --steps 20
        """,
    )
    p.add_argument("text", help="要合成的目标文本（必需）")
    p.add_argument(
        "-o", "--output",
        default=DEFAULT_OUTPUT,
        help=f"输出音频文件路径（默认: {DEFAULT_OUTPUT}）",
    )
    p.add_argument(
        "--instruction",
        default="",
        help="声音风格描述，如「中年男性，沉稳专业，播音腔」。对应 control_instruction 参数，是控制情感和音色风格的核心参数。",
    )
    p.add_argument(
        "--prompt",
        type=Path,
        default=None,
        help="参考音频文件路径（WAV/MP3），不指定则纯文字描述模式（无参考音频）",
    )
    p.add_argument(
        "--prompt-text",
        default="",
        help="参考音频对应的文本内容（配合 --prompt 使用，提供后音色还原度最高）",
    )
    p.add_argument(
        "--cfg",
        type=float,
        default=DEFAULT_CFG,
        help=f"CFG 值，越大越贴近文本语义（默认: {DEFAULT_CFG}，建议范围 2~3）",
    )
    p.add_argument(
        "--steps",
        type=int,
        default=DEFAULT_STEPS,
        help=f"扩散步数，越大质量越高但生成越慢（默认: {DEFAULT_STEPS}）",
    )
    p.add_argument("--normalize", action="store_true", help="启用音频响度归一化")
    p.add_argument("--denoise", action="store_true", help="启用降噪后处理")
    p.add_argument(
        "--user-id",
        default="claude-skill",
        help="用户标识 ID（默认: claude-skill）",
    )
    p.add_argument(
        "--api",
        default=DEFAULT_API_BASE,
        help=f"Gradio 服务器地址（默认: {DEFAULT_API_BASE}）",
    )
    return p


def main() -> None:
    if sys.version_info < (3, 10):
        print(f"[VoxCPM] 错误: 需要 Python >= 3.10，当前版本 {sys.version}")
        sys.exit(1)

    args = build_parser().parse_args()
    output = Path(args.output)
    prompt_wav: Path | None = args.prompt

    if prompt_wav is not None and not prompt_wav.exists():
        print(f"[VoxCPM] 错误: 参考音频文件不存在 → {prompt_wav}")
        sys.exit(1)

    generate(
        text=args.text,
        output=output,
        api_base=args.api,
        instruction=args.instruction,
        prompt_wav=prompt_wav,
        prompt_text=args.prompt_text,
        cfg=args.cfg,
        steps=args.steps,
        normalize=args.normalize,
        denoise=args.denoise,
        user_id=args.user_id,
    )


if __name__ == "__main__":
    main()
