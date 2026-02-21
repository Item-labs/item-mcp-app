import { MCPServer, text, widget, error } from "mcp-use/server";
import { z } from "zod";
import { getItemClient } from "./src/lib/item-api.js";

const server = new MCPServer({
  name: "item-app",
  title: "Item.app CRM",
  version: "1.0.0",
  description: "MCP server for Item.app agentic CRM",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// --- List Object Types (text only) ---
server.tool(
  {
    name: "list-object-types",
    description:
      "List all available object types in Item.app CRM (e.g., contact, company)",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const client = getItemClient();
      const result = await client.listObjectTypes();
      if (result.error) {
        return error(`Failed to list object types: ${result.error.message}`);
      }
      const names = result.data.map((t) => t.name).join(", ");
      return text(`Available object types: ${names}`);
    } catch (err) {
      return error(
        `Failed to list object types: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

// --- Create Object (with object-card widget) ---
server.tool(
  {
    name: "create-object",
    description:
      "Create a new object (contact, company, etc.) in Item.app CRM. Deduplicates contacts by email and companies by domain/name.",
    schema: z.object({
      objectType: z
        .string()
        .describe(
          "The object type slug (e.g., 'contacts', 'companies', 'deals')"
        ),
      name: z.string().describe("Display name for the object (e.g., 'Alex Johnson')"),
      fields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Custom field key-value pairs (e.g., { email: 'alex@acme.com', role: 'Engineer' })"
        ),
      profile_image_url: z
        .string()
        .optional()
        .describe("Avatar/logo URL for the object"),
    }),
    widget: {
      name: "object-card",
      invoking: "Creating...",
      invoked: "Created",
    },
  },
  async ({ objectType, name: objectName, fields, profile_image_url }) => {
    try {
      const client = getItemClient();
      const result = await client.createObject(objectType, {
        name: objectName,
        fields,
        profile_image_url,
      });
      if (result.error) {
        return error(
          `Failed to create ${objectType}: ${result.error.message}`
        );
      }

      const record = result.data.data;
      // The API returns a flat object — separate known keys from custom fields
      const { id, name: rName, created_at, updated_at, ...rest } = record as Record<string, unknown>;
      const displayFields: Record<string, unknown> = { name: rName, ...rest };

      return widget({
        props: {
          objectType,
          object: {
            id: String(id),
            objectType,
            fields: displayFields,
            createdAt: String(created_at ?? ""),
            updatedAt: String(updated_at ?? ""),
          },
          fields: displayFields,
        },
        output: text(
          `Created ${objectType} (id: ${id}) with name "${rName}" and fields: ${JSON.stringify(rest)}`
        ),
      });
    } catch (err) {
      return error(
        `Failed to create ${objectType}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

// --- List Views (text only) ---
server.tool(
  {
    name: "list-views",
    description:
      "List all available views for an object type in Item.app CRM. Use 'contacts' for People, 'companies' for Companies.",
    schema: z.object({
      objectType: z
        .string()
        .describe(
          "The object type slug (e.g., 'contacts', 'companies', 'deals')"
        ),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ objectType }) => {
    try {
      const client = getItemClient();
      const result = await client.listViews(objectType);
      if (result.error) {
        return error(`Failed to list views: ${result.error.message}`);
      }
      const views = result.data.data;
      if (views.length === 0) {
        return text(`No views available for ${objectType}.`);
      }
      const listing = views
        .map(
          (v) =>
            `- ${v.name} (id: ${v.id}, type: ${v.view_type ?? "table"})`
        )
        .join("\n");
      return text(`Available ${objectType} views:\n${listing}`);
    } catch (err) {
      return error(
        `Failed to list views: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

// --- Show View (with view-table widget) ---
server.tool(
  {
    name: "show-view",
    description:
      "Execute a saved view and display its results in a table. Use list-views first to find available view IDs.",
    schema: z.object({
      objectType: z
        .string()
        .describe(
          "The object type slug (e.g., 'contacts', 'companies', 'deals')"
        ),
      viewId: z.string().describe("The ID of the view to execute"),
      limit: z
        .number()
        .optional()
        .describe("Max number of items to return (default 50, max 200)"),
      offset: z
        .number()
        .optional()
        .describe("Number of records to skip for pagination"),
    }),
    widget: {
      name: "view-table",
      invoking: "Loading view...",
      invoked: "View loaded",
    },
  },
  async ({ objectType, viewId, limit = 50, offset = 0 }) => {
    try {
      const client = getItemClient();

      // Execute the view (the API validates the viewId for us)
      const execResult = await client.executeView(objectType, viewId, {
        limit,
        offset,
      });
      if (execResult.error) {
        return error(
          `Failed to execute view: ${execResult.error.message}`
        );
      }

      const { data: records, view, pagination } = execResult.data;

      // Derive columns from the first record's keys (excluding id, created_at, updated_at)
      const skipKeys = new Set(["id", "created_at", "updated_at"]);
      const columns: string[] = [];
      if (records.length > 0) {
        columns.push(
          ...Object.keys(records[0]).filter((k) => !skipKeys.has(k))
        );
      }

      // Normalize records into the widget's item shape
      const items = records.map((r) => ({
        id: String(r.id ?? ""),
        objectType,
        fields: Object.fromEntries(
          Object.entries(r).filter(([k]) => !skipKeys.has(k))
        ),
        createdAt: String(r.created_at ?? ""),
        updatedAt: String(r.updated_at ?? ""),
      }));

      return widget({
        props: {
          viewName: view.name,
          viewType: "table",
          items,
          columns,
        },
        output: text(
          `View "${view.name}" returned ${items.length} of ${pagination.total} records (${columns.length} columns)`
        ),
      });
    } catch (err) {
      return error(
        `Failed to show view: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

server.listen().then(() => {
  console.log("Item.app MCP server running");
});
