import { test } from "node:test";
import assert from "node:assert/strict";
import { createAutosave } from "../public/autosave.js";
test("serial saves preserve edits made during a request", async () => {
  let value = { text: "first" }, release;
  const writes = [];
  const save = createAutosave({ read: () => value, write: async (v) => {
    writes.push(v.text);
    if (writes.length === 1) await new Promise(r => { release = r; });
    return v;
  }, onState() {}, onSaved() {}, onError() {}, delay: 10000 });
  save.schedule(); const pending = save.flush();
  value.text = "second"; save.schedule(); release();
  assert.equal(await pending, true);
  assert.deepEqual(writes, ["first", "second"]);
  assert.equal(save.dirty, false);
  await save.flush();
});
test("failure keeps dirty state and flush retries", async () => {
  let fails = true;
  const save = createAutosave({ read: () => ({}), write: async () => { if (fails) throw Error(); }, onState() {}, onSaved() {}, onError() {} });
  save.schedule(); assert.equal(await save.flush(), false); assert.equal(save.dirty, true);
  fails = false; assert.equal(await save.flush(), true); assert.equal(save.dirty, false);
});
