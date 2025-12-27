// This app previously used Dexie + IndexedDB.
// Persistence has been moved to a Postgres-backed API.

export type PageRecord = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};
