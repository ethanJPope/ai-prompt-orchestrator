Finish the incomplete `completeTask` feature in this project and wire it to `POST /api/tasks/:id/complete`.

It must be safe for a multi-user production service:

- only a signed-in task owner may complete their own task;
- do not reveal whether another user's task exists;
- repeated requests by the owner must be idempotent;
- concurrent requests must produce exactly one persisted transition and one audit event;
- a persistence failure must not mutate in-memory state or emit an audit event;
- preserve the existing exports, API shapes, and error conventions.

Add thorough tests. Make the smallest maintainable change, run all tests, and explain the proof that the result is complete.
