/**
 * Item.app CRM API — Type definitions
 *
 * These types mirror the Item API responses as documented in openapi.yaml.
 * See https://docs.item.app/api-reference/ for the full specification.
 */

// ---------------------------------------------------------------------------
// Schema (GET /api/meta/schema)
// ---------------------------------------------------------------------------

export interface SchemaResponse {
  data: ObjectTypeSchema[];
}

export interface ObjectTypeSchema {
  id: number;
  slug: string;
  display_name: string;
  plural_display_name: string;
  description: string;
  icon: string;
  fields: FieldSchema[];
}

export interface FieldSchema {
  field_name: string;
  display_name: string;
  field_type: string;
  field_order: number;
  is_required: boolean;
  description: string | null;
  select_options: SelectOption[] | null;
  allow_multiple: boolean;
  related_object_type_id: number | null;
  relationship_type: string | null;
  number_min: number | null;
  number_max: number | null;
  number_decimal_places: number | null;
  currency_decimal_places: number | null;
  default_value: unknown;
  visibility_type: string;
}

export interface SelectOption {
  color: string;
  label: string;
  order: number;
  value: string;
}

// ---------------------------------------------------------------------------
// Objects CRUD
// ---------------------------------------------------------------------------

/** Paginated list response (GET /api/objects/{type}) */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/** Single object response (GET /api/objects/{type}?id=...) */
export interface SingleResponse<T> {
  data: T;
}

/** Parameters for listing objects */
export interface ListObjectsParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
}

/** Input for creating an object (PUT /api/objects/{type}) */
export interface ObjectInput {
  name: string;
  fields?: Record<string, unknown>;
  profile_image_url?: string;
}

/** Response from creating an object */
export interface CreateObjectResponse {
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Batch (POST /api/objects/{type}/batch)
// ---------------------------------------------------------------------------

export interface BatchInput {
  objects: (ObjectInput & { match_by?: string; match_value?: string })[];
}

export interface BatchResult {
  succeeded: Array<{ id: string; status: "created" | "updated" }>;
  failed: Array<{ index: number; error: string }>;
}

// ---------------------------------------------------------------------------
// Views (GET /api/objects/{type}/views)
// ---------------------------------------------------------------------------

export interface ItemView {
  id: string;
  name: string;
  view_type?: "table" | "kanban";
  columns?: string[];
}

export interface ListViewsResponse {
  data: ItemView[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface ItemApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}
