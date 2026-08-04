import { AuthenticationError, NotFoundError, ValidationError } from "./errors.mjs";

function requireActor(actor) {
  if (!actor?.id) throw new AuthenticationError();
}

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

export class TaskService {
  constructor({ store, clock = () => new Date(), audit = async () => {} }) {
    this.store = store;
    this.clock = clock;
    this.audit = audit;
  }

  async renameTask({ actor, taskId, title }) {
    requireActor(actor);
    const normalizedTaskId = requireText(taskId, "taskId");
    const normalizedTitle = requireText(title, "title");
    const task = await this.store.getById(normalizedTaskId);
    if (!task || task.ownerId !== actor.id) throw new NotFoundError();

    const saved = await this.store.save({
      ...task,
      title: normalizedTitle,
      version: task.version + 1,
    });
    await this.audit({ type: "task.renamed", actorId: actor.id, taskId: saved.id });
    return saved;
  }

  async completeTask({ actor, taskId }) {
    requireActor(actor);
    const normalizedTaskId = requireText(taskId, "taskId");
    const now = this.clock();
    const completedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    const result = await this.store.transitionToCompleted({
      taskId: normalizedTaskId,
      ownerId: actor.id,
      completedAt,
    });

    if (result.status === "not_found") throw new NotFoundError();
    if (result.status === "completed") {
      await this.audit({ type: "task.completed", actorId: actor.id, taskId: result.task.id });
    }
    return result.task;
  }
}
