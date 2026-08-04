function cloneTask(task) {
  return task ? { ...task } : null;
}

export class InMemoryTaskStore {
  #tasks;
  #beforeCommit;
  #transitionQueue = Promise.resolve();

  constructor(tasks = [], { beforeCommit = async () => {} } = {}) {
    this.#tasks = new Map(tasks.map((task) => [task.id, cloneTask(task)]));
    this.#beforeCommit = beforeCommit;
  }

  async getById(taskId) {
    return cloneTask(this.#tasks.get(taskId));
  }

  async save(task) {
    await this.#beforeCommit(cloneTask(task));
    this.#tasks.set(task.id, cloneTask(task));
    return cloneTask(task);
  }

  async transitionToCompleted({ taskId, ownerId, completedAt }) {
    const transition = this.#transitionQueue.then(async () => {
      const current = this.#tasks.get(taskId);
      if (!current || current.ownerId !== ownerId) {
        return { status: "not_found", task: null };
      }
      if (current.completedAt !== null) {
        return { status: "already_completed", task: cloneTask(current) };
      }

      const next = {
        ...current,
        completedAt,
        version: current.version + 1,
      };
      await this.#beforeCommit(cloneTask(next));
      this.#tasks.set(taskId, cloneTask(next));
      return { status: "completed", task: cloneTask(next) };
    });

    this.#transitionQueue = transition.catch(() => {});
    return transition;
  }

  snapshot(taskId) {
    return cloneTask(this.#tasks.get(taskId));
  }
}
