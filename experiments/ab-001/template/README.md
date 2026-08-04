# Task Completion Fixture

This dependency-free Node.js service uses a trusted upstream authentication layer that supplies `actor` as `{ id }`.

Public service methods return task objects shaped as `{ id, ownerId, title, completedAt, version }`. The HTTP adapter returns `{ status, body }`. Expected error mappings are already established by the rename route.

Run `npm test` to verify the repository.
