/**
 * Per-request API key propagation via AsyncLocalStorage.
 *
 * The Hono middleware wraps next() with runWithApiKey(), and any code
 * running in that async chain (including MCP tool handlers) can call
 * getApiKey() to retrieve the key — no session Map needed.
 *
 * This is a workaround for the mcp-use framework not propagating
 * the Hono request context to tool handlers (the tool handler gets
 * a stale context without query params). See MCP-1568.
 */

import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<string>();

/** Run a function with an API key bound to the current async context. */
export function runWithApiKey<T>(apiKey: string, fn: () => T): T {
  return store.run(apiKey, fn);
}

/** Get the API key for the current request, or undefined if none was set. */
export function getApiKey(): string | undefined {
  return store.getStore();
}
