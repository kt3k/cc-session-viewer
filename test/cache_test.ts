import { assertEquals } from "jsr:@std/assert";
import { LRUCache } from "../src/cache.ts";

Deno.test("LRUCache basic get/set", () => {
  const cache = new LRUCache<string, number>(3);
  cache.set("a", 1);
  cache.set("b", 2);
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.get("b"), 2);
  assertEquals(cache.get("c"), undefined);
});

Deno.test("LRUCache evicts oldest on overflow", () => {
  const cache = new LRUCache<string, number>(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3); // should evict "a"
  assertEquals(cache.get("a"), undefined);
  assertEquals(cache.get("b"), 2);
  assertEquals(cache.get("c"), 3);
});

Deno.test("LRUCache access refreshes entry", () => {
  const cache = new LRUCache<string, number>(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a"); // refresh "a"
  cache.set("c", 3); // should evict "b", not "a"
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.get("b"), undefined);
  assertEquals(cache.get("c"), 3);
});

Deno.test("LRUCache overwrite updates value and position", () => {
  const cache = new LRUCache<string, number>(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("a", 10); // overwrite "a"
  cache.set("c", 3); // should evict "b"
  assertEquals(cache.get("a"), 10);
  assertEquals(cache.get("b"), undefined);
});

Deno.test("LRUCache size and has", () => {
  const cache = new LRUCache<string, number>(3);
  assertEquals(cache.size, 0);
  cache.set("a", 1);
  assertEquals(cache.size, 1);
  assertEquals(cache.has("a"), true);
  assertEquals(cache.has("b"), false);
});

Deno.test("LRUCache clear", () => {
  const cache = new LRUCache<string, number>(3);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.clear();
  assertEquals(cache.size, 0);
  assertEquals(cache.get("a"), undefined);
});
