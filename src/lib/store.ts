import { ProcessMap } from "./types";

// Simple in-memory store for the demo
// In production, this would be a database (Supabase, etc.)
const store = new Map<string, ProcessMap>();

export function saveProcessMap(map: ProcessMap): void {
  store.set(map.id, map);
}

export function getProcessMap(id: string): ProcessMap | undefined {
  return store.get(id);
}

export function getAllProcessMaps(): ProcessMap[] {
  return Array.from(store.values());
}
