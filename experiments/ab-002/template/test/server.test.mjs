import assert from "node:assert/strict";
import test from "node:test";

import { server } from "../server.mjs";

test("the static server refuses path traversal", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/..%2Fpackage.json`);
  assert.equal(response.status, 403);
});
