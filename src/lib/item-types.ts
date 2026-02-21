// Item.app CRM API Types

export interface ObjectTypeDefinition {
  name: string;
  label: string;
  pluralLabel: string;
  description: string;
}

export interface ItemObject {
  id: string;
  objectType: string;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface ItemView {
  id: string;
  name: string;
  view_type?: "table" | "kanban";
  columns?: string[];
}

export interface ListViewsResponse {
  data: ItemView[];
}

export interface ViewExecuteResponse {
  data: Record<string, unknown>[];
  view: { id: string; name: string };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface BatchResult {
  succeeded: Array<{ id: string; status: "created" | "updated" }>;
  failed: Array<{ index: number; error: string }>;
}

export interface ListObjectsParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, unknown>;
}

export interface ObjectInput {
  name: string;
  fields?: Record<string, unknown>;
  profile_image_url?: string;
}

export interface CreateObjectResponse {
  data: Record<string, unknown>;
}

export interface BatchInput {
  objects: ObjectInput[];
  matchBy?: string;
}

export interface ItemApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}
