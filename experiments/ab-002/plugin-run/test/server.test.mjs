import assert from "node:assert/strict";
import test from "node:test";

import { server } from "../server.mjs";

test("the static server delivers public assets and enforces boundaries", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  for (const [pathname, contentType] of [
    ["/", "text/html; charset=utf-8"],
    ["/styles.css", "text/css; charset=utf-8"],
    ["/app.js", "text/javascript; charset=utf-8"],
  ]) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 200, pathname);
    assert.equal(response.headers.get("content-type"), contentType, pathname);
    assert.ok((await response.text()).length > 100, pathname);
  }

  const missing = await fetch(`${base}/missing.txt`);
  assert.equal(missing.status, 404);

  const traversal = await fetch(`${base}/..%2Fpackage.json`);
  assert.equal(traversal.status, 403);
});
