/**
 * Item.app MCP Server
 *
 * Exposes Item CRM data via 6 MCP tools:
 *   - get-schema:   Learn object types and their fields
 *   - get-objects:  List/search objects with view support (table + kanban)
 *   - get-object:   Fetch a single object by ID or email
 *   - create-object: Create a new object
 *   - update-object: Update an existing object's fields
 *   - delete-object: Soft-delete an object
 *
 * The agent should call get-schema first to learn available object types,
 * field names, field types, select options, and relationships.
 */

import { MCPServer, text, widget, error } from "mcp-use/server";
import { z } from "zod";
import { getItemClient, setSessionApiKey } from "./src/lib/item-api.js";
import type { FieldSchema, ObjectTypeSchema } from "./src/lib/item-types.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new MCPServer({
  name: "item-app",
  title: "Item.app CRM",
  version: "1.0.0",
  description: "MCP server for Item.app agentic CRM",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [{ src: "favicon.ico", mimeType: "image/x-icon", sizes: ["16x16", "32x32"] }],
});

// ---------------------------------------------------------------------------
// Middleware: extract api_key from URL query param for per-user auth.
// Users connect with: https://host/mcp?api_key=sk_live_...
// The key is stored by session ID so each user gets their own API client.
// Falls back to ITEM_API_KEY env var for local development.
// ---------------------------------------------------------------------------

server.use("/mcp", async (c, next) => {
  const apiKey = c.req.query("api_key");
  const sessionId = c.req.header("mcp-session-id");
  if (apiKey && sessionId) {
    setSessionApiKey(sessionId, apiKey);
  }
  await next();
});

// ---------------------------------------------------------------------------
// Helpers — schema formatting
// ---------------------------------------------------------------------------

/** Internal fields that should not be exposed to the widget UI */
const INTERNAL_KEYS = new Set(["id", "created_at", "updated_at"]);

/** Format a single field definition for the agent's text output */
function describeField(f: FieldSchema): string {
  let desc = `${f.field_name} (${f.field_type}`;
  if (f.is_required) desc += ", required";
  desc += ")";
  if (f.description) desc += ` — ${f.description}`;
  if (f.select_options?.length) {
    desc += ` [options: ${f.select_options.map((o) => o.value).join(", ")}]`;
  }
  if (f.related_object_type_id) {
    desc += ` [ID of related object type ${f.related_object_type_id}]`;
  }
  return desc;
}

/** Format a list of object types with their fields for the agent */
function describeSchema(types: ObjectTypeSchema[]): string {
  return types
    .map((t) => {
      const fields = t.fields.map((f) => `  - ${describeField(f)}`).join("\n");
      return `## ${t.plural_display_name} (slug: "${t.slug}")\n${t.description}\nFields:\n${fields}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Helpers — record → widget props
// ---------------------------------------------------------------------------

interface WidgetItem {
  id: string;
  objectType: string;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Convert a raw API record into the shape expected by the view-table widget */
function toWidgetItem(record: Record<string, unknown>, objectType: string): WidgetItem {
  return {
    id: String(record.id ?? ""),
    objectType,
    fields: Object.fromEntries(
      Object.entries(record).filter(([k]) => !INTERNAL_KEYS.has(k))
    ),
    createdAt: String(record.created_at ?? ""),
    updatedAt: String(record.updated_at ?? ""),
  };
}

/** Convert a raw API record into the shape expected by the object-card widget */
function toCardProps(record: Record<string, unknown>, objectType: string) {
  const { id, created_at, updated_at, ...fields } = record;
  return {
    objectType,
    object: {
      id: String(id),
      objectType,
      fields,
      createdAt: String(created_at ?? ""),
      updatedAt: String(updated_at ?? ""),
    },
    fields,
  };
}

// ---------------------------------------------------------------------------
// Tool: get-schema
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-schema",
    description:
      "Get the full schema of all object types in this Item CRM workspace, " +
      "including field names, types, required status, select options, and relationships. " +
      "Call this FIRST before creating or updating objects.",
    schema: z.object({
      objectType: z.string().optional().describe(
        "Filter to a specific object type slug (e.g., 'contacts'). Omit to get all types."
      ),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ objectType }, ctx) => {
    const client = getItemClient(ctx.session.sessionId);
    const result = await client.getSchema();
    if (result.error) return error(`Failed to get schema: ${result.error.message}`);

    let types = result.data.data;
    if (objectType) {
      types = types.filter((t) => t.slug === objectType);
      if (types.length === 0) {
        return error(`Object type "${objectType}" not found.`);
      }
    }

    return text(describeSchema(types));
  }
);

// ---------------------------------------------------------------------------
// Tool: get-objects
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-objects",
    description:
      "List or search objects. Auto-selects the first saved view when no viewId or search is given. " +
      "The widget renders as table or kanban based on the view's type.",
    schema: z.object({
      objectType: z.string().describe("Object type slug (e.g., 'contacts', 'companies', 'deals')"),
      viewId: z.string().optional().describe("Saved view ID. Omit to auto-select the first view."),
      search: z.string().optional().describe("Search query (skips view auto-selection)"),
      limit: z.number().optional().describe("Max items per page (default 50, max 200)"),
      offset: z.number().optional().describe("Records to skip for pagination"),
      sort: z.string().optional().describe("Field name to sort by"),
      order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    }),
    annotations: { readOnlyHint: true },
    widget: { name: "view-display", invoking: "Loading...", invoked: "Loaded" },
  },
  async ({ objectType, viewId, search, limit = 50, offset = 0, sort, order }, ctx) => {
    const client = getItemClient(ctx.session.sessionId);

    // Fetch objects and views in parallel
    const [viewsResult, listResult] = await Promise.all([
      client.listViews(objectType),
      client.listObjects(objectType, { search, limit, offset, sort_by: sort, sort_order: order }),
    ]);

    if (listResult.error) return error(`Failed to list ${objectType}: ${listResult.error.message}`);

    const allViews = viewsResult.error ? [] : viewsResult.data.data;
    const records = listResult.data.data;
    const pagination = listResult.data.pagination;

    // Resolve the active view: explicit viewId > auto-select first view > none (plain list)
    const activeViewId = viewId ?? (!search ? allViews[0]?.id : undefined);
    const activeView = activeViewId ? allViews.find((v) => v.id === activeViewId) : undefined;

    // View metadata drives the display: columns, view type, name
    const viewName = activeView?.name ?? (search ? `Search: "${search}"` : "All");
    const viewType = activeView?.view_type ?? "table";
    const columns = activeView?.columns ??
      (records.length > 0 ? Object.keys(records[0]).filter((k) => !INTERNAL_KEYS.has(k)) : []);

    return widget({
      props: {
        objectType,
        viewName,
        viewType,
        viewId: activeViewId ?? "",
        columns,
        items: records.map((r) => toWidgetItem(r, objectType)),
        pagination: {
          total: pagination.total,
          limit: pagination.limit,
          offset: pagination.offset,
          hasMore: pagination.has_more,
        },
        availableViews: allViews.map((v) => ({
          id: v.id,
          name: v.name,
          viewType: v.view_type ?? "table",
          columns: v.columns ?? [],
        })),
      },
      output: text(`${viewName} (${viewType}) — ${records.length} of ${pagination.total} ${objectType}`),
    });
  }
);

// ---------------------------------------------------------------------------
// Tool: get-object
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-object",
    description: "Get a single object by ID or email with all fields.",
    schema: z.object({
      objectType: z.string().describe("Object type slug"),
      id: z.string().optional().describe("Object ID"),
      email: z.string().optional().describe("Object email (contacts only)"),
    }),
    annotations: { readOnlyHint: true },
    widget: { name: "object-card", invoking: "Loading...", invoked: "Loaded" },
  },
  async ({ objectType, id, email }, ctx) => {
    if (!id && !email) return error("Provide either id or email.");

    const client = getItemClient(ctx.session.sessionId);
    const result = await client.getObject(objectType, { id, email }, { include_all_fields: true });
    if (result.error) return error(`Failed to get ${objectType}: ${result.error.message}`);

    const record = result.data.data;
    return widget({
      props: toCardProps(record, objectType),
      output: text(`${objectType} #${record.id}: ${JSON.stringify(
        Object.fromEntries(Object.entries(record).filter(([k]) => !INTERNAL_KEYS.has(k)))
      )}`),
    });
  }
);

// ---------------------------------------------------------------------------
// Tool: create-object
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "create-object",
    description:
      "Create a new object. Call get-schema first to see available fields. " +
      "Deduplicates contacts by email, companies by domain/name.",
    schema: z.object({
      objectType: z.string().describe("Object type slug"),
      name: z.string().describe("Display name"),
      fields: z.record(z.string(), z.unknown()).optional().describe("Field key-value pairs (see get-schema)"),
      profile_image_url: z.string().optional().describe("Avatar/logo URL"),
    }),
    widget: { name: "object-card", invoking: "Creating...", invoked: "Created" },
  },
  async ({ objectType, name: objectName, fields, profile_image_url }, ctx) => {
    const client = getItemClient(ctx.session.sessionId);
    const result = await client.createObject(objectType, { name: objectName, fields, profile_image_url });
    if (result.error) return error(`Failed to create ${objectType}: ${result.error.message}`);

    const record = result.data.data;
    return widget({
      props: toCardProps(record, objectType),
      output: text(`Created ${objectType} #${record.id}: "${record.name}"`),
    });
  }
);

// ---------------------------------------------------------------------------
// Tool: update-object
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "update-object",
    description: "Update an existing object's fields. Call get-schema first to see available fields.",
    schema: z.object({
      objectType: z.string().describe("Object type slug"),
      id: z.string().describe("Object ID to update"),
      name: z.string().optional().describe("New display name"),
      fields: z.record(z.string(), z.unknown()).optional().describe("Field key-value pairs to update"),
      profile_image_url: z.string().optional().describe("New avatar/logo URL"),
    }),
  },
  async ({ objectType, id, name: objectName, fields, profile_image_url }, ctx) => {
    const client = getItemClient(ctx.session.sessionId);
    const input: Partial<{ name: string; fields: Record<string, unknown>; profile_image_url: string }> = {};
    if (objectName !== undefined) input.name = objectName;
    if (fields !== undefined) input.fields = fields;
    if (profile_image_url !== undefined) input.profile_image_url = profile_image_url;

    const result = await client.updateObject(objectType, id, input);
    if (result.error) return error(`Failed to update ${objectType}: ${result.error.message}`);

    return text(`Updated ${objectType} #${id}`);
  }
);

// ---------------------------------------------------------------------------
// Tool: delete-object
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "delete-object",
    description: "Soft-delete an object by ID. Can be recovered.",
    schema: z.object({
      objectType: z.string().describe("Object type slug"),
      id: z.string().describe("Object ID to delete"),
    }),
  },
  async ({ objectType, id }, ctx) => {
    const client = getItemClient(ctx.session.sessionId);
    const result = await client.deleteObject(objectType, id);
    if (result.error) return error(`Failed to delete ${objectType}: ${result.error.message}`);

    return text(`Deleted ${objectType} #${id} (soft delete)`);
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

server.listen().then(() => console.log("Item.app MCP server running"));
