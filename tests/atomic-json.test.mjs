import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  readJsonFile,
  writeJsonAtomic
} from "../plugins/storyboard-workbench/app/lib/atomic-json.mjs";

test("writes complete JSON and keeps bounded backups", async () => {
  const root = await mkdtemp(join(tmpdir(), "storyboard-json-"));
  const file = join(root, "project.json");
  const backups = join(root, "backups");

  await writeJsonAtomic(file, { version: 1 }, { backupDir: backups, maxBackups: 2 });
  await writeJsonAtomic(file, { version: 2 }, { backupDir: backups, maxBackups: 2 });
  await new Promise((resolve) => setTimeout(resolve, 2));
  await writeJsonAtomic(file, { version: 3 }, { backupDir: backups, maxBackups: 2 });
  await new Promise((resolve) => setTimeout(resolve, 2));
  await writeJsonAtomic(file, { version: 4 }, { backupDir: backups, maxBackups: 2 });

  assert.deepEqual(await readJsonFile(file), { version: 4 });
  const names = (await readdir(backups)).filter((name) => name.endsWith(".json"));
  assert.equal(names.length, 2);
  assert.equal((await readdir(root)).some((name) => name.includes(".tmp-")), false);
});
