import { AuthenticationError, NotFoundError, ValidationError } from "./errors.mjs";

function responseForError(error) {
  if (error instanceof AuthenticationError) {
    return { status: 401, body: { error: "authentication_required" } };
  }
  if (error instanceof ValidationError) {
    return { status: 400, body: { error: "invalid_request", message: error.message } };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, body: { error: "task_not_found" } };
  }
  return { status: 500, body: { error: "internal_error" } };
}

export function createHttpHandler({ service }) {
  return async function handle(request) {
    try {
      const renameMatch = /^\/api\/tasks\/([^/]+)\/rename$/.exec(request.path);
      if (request.method === "POST" && renameMatch) {
        const task = await service.renameTask({
          actor: request.actor,
          taskId: decodeURIComponent(renameMatch[1]),
          title: request.body?.title,
        });
        return { status: 200, body: { task } };
      }

      return { status: 404, body: { error: "route_not_found" } };
    } catch (error) {
      return responseForError(error);
    }
  };
}
