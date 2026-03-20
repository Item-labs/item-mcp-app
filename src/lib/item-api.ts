/**
 * Item.app CRM API Client
 *
 * Wraps the Item REST API with typed methods for schema, CRUD, batch, and views.
 * Authentication is via the x-api-key header (API key from Settings > System).
 *
 * All methods return ApiResult<T> — either { data, error: null } or { data: null, error }.
 */

import type {
  SchemaResponse,
  PaginatedResponse,
  SingleResponse,
  ListViewsResponse,
  CreateObjectResponse,
  BatchResult,
  ListObjectsParams,
  ObjectInput,
  BatchInput,
  ItemApiError,
} from "./item-types.js";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ItemApiError };

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class ItemApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    const apiKey = options?.apiKey ?? process.env.ITEM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "No API key provided. Connect with ?api_key=sk_live_... in the URL, or set ITEM_API_KEY env var."
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? "https://app.useitem.io/api";
  }

  // ---- Internal request helper ----

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResult<T>> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        redirect: "manual",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // Redirects (e.g. 307 → /login) indicate an auth problem
      if (response.status >= 300 && response.status < 400) {
        return {
          data: null,
          error: {
            status: response.status,
            message: `API redirected (HTTP ${response.status}). Check your API key.`,
            code: "REDIRECT",
          },
        };
      }

      if (!response.ok) {
        let errorBody: unknown;
        try { errorBody = await response.json(); } catch { errorBody = await response.text(); }
        return {
          data: null,
          error: {
            status: response.status,
            message:
              typeof errorBody === "object" && errorBody !== null && "error" in errorBody
                ? String((errorBody as Record<string, unknown>).error)
                : `HTTP ${response.status}: ${response.statusText}`,
            details: errorBody,
          },
        };
      }

      if (response.status === 204) return { data: undefined as unknown as T, error: null };

      return { data: (await response.json()) as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          status: 0,
          message: err instanceof Error ? err.message : "Unknown network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) sp.set(key, String(value));
    }
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  }

  // ---- Schema ----

  /** GET /api/meta/schema — returns all object types with field definitions */
  async getSchema(): Promise<ApiResult<SchemaResponse>> {
    return this.request<SchemaResponse>("/meta/schema");
  }

  // ---- Objects CRUD ----

  /** GET /api/objects/{type} — list/search objects with pagination */
  async listObjects(
    objectType: string,
    params: ListObjectsParams = {}
  ): Promise<ApiResult<PaginatedResponse<Record<string, unknown>>>> {
    const filterParams: Record<string, unknown> = {};
    if (params.filters) {
      for (const [k, v] of Object.entries(params.filters)) {
        filterParams[`filter[${k}]`] = v;
      }
    }
    const qs = this.buildQueryString({
      limit: params.limit,
      offset: params.offset,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
      search: params.search,
      ...filterParams,
    });
    return this.request<PaginatedResponse<Record<string, unknown>>>(
      `/objects/${objectType}${qs}`
    );
  }

  /** GET /api/objects/{type}?id=...&include_all_fields=true — get a single object */
  async getObject(
    objectType: string,
    identifier: { id?: string; email?: string },
    options?: { include_all_fields?: boolean; include_summary?: boolean }
  ): Promise<ApiResult<SingleResponse<Record<string, unknown>>>> {
    const qs = this.buildQueryString({
      ...identifier,
      include_all_fields: options?.include_all_fields,
      include_summary: options?.include_summary,
    });
    return this.request<SingleResponse<Record<string, unknown>>>(
      `/objects/${objectType}${qs}`
    );
  }

  /** PUT /api/objects/{type} — create a new object */
  async createObject(
    objectType: string,
    input: ObjectInput
  ): Promise<ApiResult<CreateObjectResponse>> {
    return this.request<CreateObjectResponse>(
      `/objects/${objectType}`,
      { method: "PUT", body: JSON.stringify(input) }
    );
  }

  /**
   * PATCH /api/objects/{type} — update an existing object.
   * Top-level props (name, profile_image_url) go at root.
   * Custom fields go nested under "fields".
   */
  async updateObject(
    objectType: string,
    id: string,
    input: Partial<ObjectInput>
  ): Promise<ApiResult<SingleResponse<Record<string, unknown>>>> {
    const { fields, ...topLevel } = input;
    return this.request<SingleResponse<Record<string, unknown>>>(
      `/objects/${objectType}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          id: Number(id),
          ...topLevel,
          ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
        }),
      }
    );
  }

  /** DELETE /api/objects/{type} — soft-delete an object */
  async deleteObject(
    objectType: string,
    id: string
  ): Promise<ApiResult<void>> {
    return this.request<void>(`/objects/${objectType}`, {
      method: "DELETE",
      body: JSON.stringify({ id: Number(id) }),
    });
  }

  // ---- Batch ----

  /** POST /api/objects/{type}/batch — batch create or update up to 100 objects */
  async batchCreateOrUpdate(
    objectType: string,
    input: BatchInput
  ): Promise<ApiResult<BatchResult>> {
    return this.request<BatchResult>(`/objects/${objectType}/batch`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // ---- Views ----

  /** GET /api/objects/{type}/views — list all shared views (with columns + view_type) */
  async listViews(objectType: string): Promise<ApiResult<ListViewsResponse>> {
    return this.request<ListViewsResponse>(`/objects/${objectType}/views`);
  }
}

// ---------------------------------------------------------------------------
// Per-session client management
// ---------------------------------------------------------------------------

/** API keys indexed by MCP session ID, populated by the /mcp middleware */
const sessionApiKeys = new Map<string, string>();

export function setSessionApiKey(sessionId: string, apiKey: string): void {
  sessionApiKeys.set(sessionId, apiKey);
}

/** Fallback singleton for local dev (reads from ITEM_API_KEY env var) */
let _defaultClient: ItemApiClient | null = null;

/**
 * Get an API client for the given session.
 * Looks up the API key from:
 *   1. Per-session store (set via URL ?api_key= param)
 *   2. ITEM_API_KEY environment variable (local dev fallback)
 */
export function getItemClient(sessionId?: string): ItemApiClient {
  if (sessionId) {
    const key = sessionApiKeys.get(sessionId);
    if (key) return new ItemApiClient({ apiKey: key });
  }
  if (!_defaultClient) _defaultClient = new ItemApiClient();
  return _defaultClient;
}
