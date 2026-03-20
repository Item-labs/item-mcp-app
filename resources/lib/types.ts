/** Shared types for widget components */

export type Item = {
  id: string;
  objectType: string;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ViewMeta = {
  id: string;
  name: string;
  viewType: string;
  columns: string[];
};
