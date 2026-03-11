import { kv } from "@vercel/kv";
import { ProcessMap } from "./types";

// In-memory fallback for local development (when KV isn't configured)
const memoryStore = new Map<string, ProcessMap>();
const useKV = !!process.env.KV_REST_API_URL;

export async function saveProcessMap(map: ProcessMap): Promise<void> {
  if (useKV) {
    await kv.set(`sop:${map.id}`, JSON.stringify(map), { ex: 60 * 60 * 24 * 7 }); // 7 day TTL
  } else {
    memoryStore.set(map.id, map);
  }
}

export async function getProcessMap(id: string): Promise<ProcessMap | undefined> {
  if (useKV) {
    const data = await kv.get<string>(`sop:${id}`);
    if (!data) return undefined;
    return typeof data === "string" ? JSON.parse(data) : data as unknown as ProcessMap;
  } else {
    return memoryStore.get(id);
  }
}
