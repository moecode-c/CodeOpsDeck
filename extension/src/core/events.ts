/**
 * Tiny typed event bus used for cross-feature communication (PLAN §4 `events.ts`).
 *
 * No `vscode` dependency, so it is fully unit-testable. Listener errors are
 * isolated so one bad subscriber can't break the bus for the others.
 */

export type Listener<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  /** Subscribe. Returns a disposer that removes the listener. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => void set?.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        (listener as Listener<Events[K]>)(payload);
      } catch {
        // Swallow: a throwing subscriber must not break delivery to the rest.
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  dispose(): void {
    this.clear();
  }
}
