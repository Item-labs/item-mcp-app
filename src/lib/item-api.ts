import type {
  ObjectTypeDefinition,
  ItemObject,
  PaginatedResponse,
  SingleResponse,
  ItemView,
  ListViewsResponse,
  ViewExecuteResponse,
  CreateObjectResponse,
  BatchResult,
  ListObjectsParams,
  ObjectInput,
  BatchInput,
  ItemApiError,
} from "./item-types.js";

// MOCK: Object types (replace when Akshay adds the endpoint)
const MOCK_OBJECT_TYPES: ObjectTypeDefinition[] = [
  {
    name: "contact",
    label: "Contact",
    pluralLabel: "Contacts",
    description: "Individual people and leads",
  },
  {
    name: "company",
    label: "Company",
    pluralLabel: "Companies",
    description: "Organizations and accounts",
  },
];

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ItemApiError };

export class ItemApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    const apiKey = options?.apiKey ?? process.env.ITEM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ITEM_API_KEY is required. Set it in environment variables or pass to constructor."
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? "https://app.useitem.io/api";
  }

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

      // Treat redirects (e.g. 307 → /login) as auth errors
      if (response.status >= 300 && response.status < 400) {
        return {
          data: null,
          error: {
            status: response.status,
            message: `API redirected (HTTP ${response.status}). Check your API key and endpoint.`,
            code: "REDIRECT",
          },
        };
      }

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }

        return {
          data: null,
          error: {
            status: response.status,
            message:
              typeof errorBody === "object" &&
              errorBody !== null &&
              "message" in errorBody
                ? String((errorBody as Record<string, unknown>).message)
                : `HTTP ${response.status}: ${response.statusText}`,
            details: errorBody,
          },
        };
      }

      if (response.status === 204) {
        return { data: undefined as unknown as T, error: null };
      }

      const data = (await response.json()) as T;
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          status: 0,
          message:
            err instanceof Error ? err.message : "Unknown network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `?${qs}` : "";
  }

  // --- Object Types (MOCK) ---

  async listObjectTypes(): Promise<ApiResult<ObjectTypeDefinition[]>> {
    // MOCK: Replace with this.request<ObjectTypeDefinition[]>("/object-types")
    return { data: MOCK_OBJECT_TYPES, error: null };
  }

  // --- Objects CRUD ---

  async listObjects(
    objectType: string,
    params: ListObjectsParams = {}
  ): Promise<ApiResult<PaginatedResponse<ItemObject>>> {
    const qs = this.buildQueryString({
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
      order: params.order,
      search: params.search,
      ...params.filters,
    });
    return this.request<PaginatedResponse<ItemObject>>(
      `/objects/${objectType}${qs}`
    );
  }

  async getObject(
    objectType: string,
    id: string
  ): Promise<ApiResult<SingleResponse<ItemObject>>> {
    return this.request<SingleResponse<ItemObject>>(
      `/objects/${objectType}/${id}`
    );
  }

  async createObject(
    objectType: string,
    input: ObjectInput
  ): Promise<ApiResult<CreateObjectResponse>> {
    return this.request<CreateObjectResponse>(
      `/objects/${objectType}`,
      { method: "PUT", body: JSON.stringify(input) }
    );
  }

  async updateObject(
    objectType: string,
    id: string,
    input: Partial<ObjectInput>
  ): Promise<ApiResult<SingleResponse<ItemObject>>> {
    return this.request<SingleResponse<ItemObject>>(
      `/objects/${objectType}/${id}`,
      { method: "PATCH", body: JSON.stringify(input) }
    );
  }

  async deleteObject(
    objectType: string,
    id: string
  ): Promise<ApiResult<void>> {
    return this.request<void>(`/objects/${objectType}/${id}`, {
      method: "DELETE",
    });
  }

  // --- Batch Operations ---

  async batchCreateOrUpdate(
    objectType: string,
    input: BatchInput
  ): Promise<ApiResult<BatchResult>> {
    return this.request<BatchResult>(`/objects/${objectType}/batch`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // --- Views ---

  async listViews(
    objectType: string
  ): Promise<ApiResult<ListViewsResponse>> {
    return this.request<ListViewsResponse>(
      `/objects/${objectType}/views`
    );
  }

  async executeView(
    objectType: string,
    viewId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<ApiResult<ViewExecuteResponse>> {
    const qs = this.buildQueryString({
      limit: params.limit,
      offset: params.offset,
    });
    return this.request<ViewExecuteResponse>(
      `/objects/${objectType}/views/${viewId}${qs}`
    );
  }

  // --- Pagination Helper ---

  async fetchAllPages<T>(
    fetcher: (page: number) => Promise<ApiResult<PaginatedResponse<T>>>
  ): Promise<ApiResult<T[]>> {
    const allItems: T[] = [];
    let page = 1;

    while (true) {
      const result = await fetcher(page);
      if (result.error) return { data: null, error: result.error };

      allItems.push(...result.data.data);
      if (!result.data.pagination.hasNextPage) break;

      page++;
      if (page > 100) break; // safety valve
    }

    return { data: allItems, error: null };
  }
}

// Singleton
let _client: ItemApiClient | null = null;

export function getItemClient(): ItemApiClient {
  if (!_client) {
    _client = new ItemApiClient();
  }
  return _client;
}
