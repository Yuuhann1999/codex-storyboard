import { spawn } from "node:child_process";
import net from "node:net";
import { join } from "node:path";

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

export async function startApp({ repoRoot, dataDir }) {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [
      join(repoRoot, "plugins/storyboard-workbench/app/server.mjs"),
      "--port",
      String(port),
      "--data-dir",
      dataDir
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 5_000;
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`app exited before becoming healthy: ${stderr}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return { child, url };
    } catch {
      // The local server may still be binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  child.kill("SIGTERM");
  throw new Error(`app did not become healthy: ${stderr}`);
}
