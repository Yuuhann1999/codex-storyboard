import { spawn } from "node:child_process";

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `环境变量保存失败（退出码 ${code}）`));
    });
  });
}

function collectChildOutput(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `环境变量读取失败（退出码 ${code}）`));
    });
  });
}

export async function readUserEnvironmentVariable(name) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error("环境变量名称无效");
  if (process.env[name]) return process.env[name];
  if (process.platform !== "win32") return "";
  const script = `[Console]::Out.Write([Environment]::GetEnvironmentVariable('${name}', 'User'))`;
  const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return collectChildOutput(child);
}

export async function persistUserEnvironmentVariable(name, value) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error("环境变量名称无效");
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error("密钥不能为空");

  if (process.platform !== "win32") {
    throw new Error("设置页保存环境变量目前仅支持 Windows");
  }

  const script = `[Environment]::SetEnvironmentVariable('${name}', $env:CODEX_STORYBOARD_SECRET_VALUE, 'User')`;
  const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    env: { ...process.env, CODEX_STORYBOARD_SECRET_VALUE: normalized },
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"]
  });
  await waitForChild(child);
  process.env[name] = normalized;
}
