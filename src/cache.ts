/**
 * Simple LRU cache using Map insertion order.
 * When capacity is exceeded, the least recently accessed entry is evicted.
 */
export class LRUCache<K, V> {
  #map = new Map<K, V>();
  #capacity: number;

  constructor(capacity: number) {
    this.#capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.#map.get(key);
    if (value === undefined) return undefined;

    // Move to end (most recently used)
    this.#map.delete(key);
    this.#map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete first to update position
    this.#map.delete(key);

    // Evict oldest if at capacity
    if (this.#map.size >= this.#capacity) {
      const oldest = this.#map.keys().next().value!;
      this.#map.delete(oldest);
    }

    this.#map.set(key, value);
  }

  has(key: K): boolean {
    return this.#map.has(key);
  }

  get size(): number {
    return this.#map.size;
  }

  clear(): void {
    this.#map.clear();
  }
}
