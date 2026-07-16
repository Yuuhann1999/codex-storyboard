import { randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function trimBackups(backupDir, maxBackups) {
  const entries = (await readdir(backupDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  const removeCount = Math.max(0, entries.length - maxBackups);
  await Promise.all(
    entries.slice(0, removeCount).map((name) => rm(join(backupDir, name)))
  );
}

export async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeJsonAtomic(
  filePath,
  value,
  { backupDir, maxBackups = 5 } = {}
) {
  await mkdir(dirname(filePath), { recursive: true });
  if (backupDir && (await exists(filePath))) {
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    await copyFile(
      filePath,
      join(backupDir, `${stamp}-${randomUUID()}-${basename(filePath)}`)
    );
    await trimBackups(backupDir, maxBackups);
  }

  const temporary = join(
    dirname(filePath),
    `.${basename(filePath)}.tmp-${randomUUID()}`
  );
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return value;
}
