import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const plugin = new URL("../plugins/storyboard-workbench/", import.meta.url);

test("plugin has an independent identity and local marketplace entry", async () => {
  const manifest = JSON.parse(
    await readFile(new URL(".codex-plugin/plugin.json", plugin), "utf8")
  );
  const marketplace = JSON.parse(
    await readFile(new URL(".agents/plugins/marketplace.json", root), "utf8")
  );
  const mcp = JSON.parse(await readFile(new URL(".mcp.json", plugin), "utf8"));
  const mcpSource = await readFile(new URL("mcp/server.mjs", plugin), "utf8");
  const appSource = await readFile(new URL("app/server.mjs", plugin), "utf8");

  assert.equal(manifest.name, "storyboard-workbench");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.interface.displayName, "Storyboard Workbench");
  assert.equal(marketplace.name, "storyboard-workbench");
  assert.equal(marketplace.plugins[0].name, "storyboard-workbench");
  assert.equal(
    marketplace.plugins[0].source.path,
    "./plugins/storyboard-workbench"
  );
  assert.ok(mcp.mcpServers.storyboard_workbench_mcp);
  assert.match(mcpSource, /Storyboard Workbench MCP/);
  assert.match(mcpSource, /STORYBOARD_WORKBENCH_DATA_DIR/);
  assert.match(mcpSource, /\.storyboard-workbench/);
  assert.match(mcpSource, /43219/);
  assert.match(appSource, /STORYBOARD_WORKBENCH_DATA_DIR/);
  assert.match(appSource, /\.storyboard-workbench/);
  assert.match(appSource, /43219/);
});
