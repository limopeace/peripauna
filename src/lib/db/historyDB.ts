import { openDB, DBSchema, IDBPDatabase } from "idb";
import { GenerationRecord, UsageRecord, DownloadRecord } from "@/types/history";

// ============================================
// IndexedDB Schema
// ============================================

interface FloraHistoryDB extends DBSchema {
  generations: {
    key: string;
    value: GenerationRecord;
    indexes: {
      "by-date": Date;
      "by-type": string;
      "by-model": string;
      "by-status": string;
      "by-nodeId": string;
      "by-favorite": number; // 0 or 1
    };
  };
  usage: {
    key: string;
    value: UsageRecord;
    indexes: {
      "by-date": Date;
      "by-type": string;
      "by-model": string;
    };
  };
  downloads: {
    key: string;
    value: DownloadRecord;
    indexes: {
      "by-date": Date;
      "by-generationId": string;
    };
  };
}

const DB_NAME = "flora-history";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<FloraHistoryDB> | null = null;

// ============================================
// Database Initialization
// ============================================

export async function getDB(): Promise<IDBPDatabase<FloraHistoryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FloraHistoryDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Fresh install or upgrade from version 0
      if (oldVersion < 1) {
        // Generations store
        const generationsStore = db.createObjectStore("generations", {
          keyPath: "id",
        });
        generationsStore.createIndex("by-date", "createdAt");
        generationsStore.createIndex("by-type", "type");
        generationsStore.createIndex("by-model", "model");
        generationsStore.createIndex("by-status", "status");
        generationsStore.createIndex("by-nodeId", "nodeId");
        generationsStore.createIndex("by-favorite", "favorite");

        // Usage store
        const usageStore = db.createObjectStore("usage", {
          keyPath: "id",
        });
        usageStore.createIndex("by-date", "timestamp");
        usageStore.createIndex("by-type", "type");
        usageStore.createIndex("by-model", "model");

        // Downloads store
        const downloadsStore = db.createObjectStore("downloads", {
          keyPath: "id",
        });
        downloadsStore.createIndex("by-date", "downloadedAt");
        downloadsStore.createIndex("by-generationId", "generationId");
      }

      // Future migrations go here
      // if (oldVersion < 2) { ... }
    },
  });

  return dbInstance;
}

// ============================================
// Generation Records CRUD
// ============================================

export async function addGeneration(
  record: GenerationRecord
): Promise<string> {
  const db = await getDB();
  await db.put("generations", record);
  return record.id;
}

export async function getGeneration(
  id: string
): Promise<GenerationRecord | undefined> {
  const db = await getDB();
  return db.get("generations", id);
}

export async function updateGeneration(
  id: string,
  updates: Partial<GenerationRecord>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("generations", id);
  if (existing) {
    await db.put("generations", { ...existing, ...updates });
  }
}

export async function deleteGeneration(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("generations", id);
}

export async function getAllGenerations(): Promise<GenerationRecord[]> {
  const db = await getDB();
  const all = await db.getAll("generations");
  // Sort by date descending (newest first)
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getGenerationsByType(
  type: "image" | "video"
): Promise<GenerationRecord[]> {
  const db = await getDB();
  const results = await db.getAllFromIndex("generations", "by-type", type);
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getGenerationsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<GenerationRecord[]> {
  const db = await getDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  const results = await db.getAllFromIndex("generations", "by-date", range);
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getGenerationsByNodeId(
  nodeId: string
): Promise<GenerationRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("generations", "by-nodeId", nodeId);
}

export async function getFavoriteGenerations(): Promise<GenerationRecord[]> {
  const db = await getDB();
  // IndexedDB boolean to number conversion (true = 1)
  const results = await db.getAllFromIndex(
    "generations",
    "by-favorite",
    1 as unknown as number
  );
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await getDB();
  const record = await db.get("generations", id);
  if (record) {
    record.favorite = !record.favorite;
    await db.put("generations", record);
    return record.favorite;
  }
  return false;
}

export async function clearAllGenerations(): Promise<void> {
  const db = await getDB();
  await db.clear("generations");
}

// ============================================
// Usage Records CRUD
// ============================================

export async function addUsageRecord(record: UsageRecord): Promise<string> {
  const db = await getDB();
  await db.put("usage", record);
  return record.id;
}

export async function getAllUsageRecords(): Promise<UsageRecord[]> {
  const db = await getDB();
  const all = await db.getAll("usage");
  return all.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getUsageByDateRange(
  startDate: Date,
  endDate: Date
): Promise<UsageRecord[]> {
  const db = await getDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  return db.getAllFromIndex("usage", "by-date", range);
}

export async function getUsageByModel(model: string): Promise<UsageRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("usage", "by-model", model);
}

export async function clearAllUsage(): Promise<void> {
  const db = await getDB();
  await db.clear("usage");
}

// ============================================
// Download Records CRUD
// ============================================

export async function addDownloadRecord(
  record: DownloadRecord
): Promise<string> {
  const db = await getDB();
  await db.put("downloads", record);
  return record.id;
}

export async function getDownloadsByGenerationId(
  generationId: string
): Promise<DownloadRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("downloads", "by-generationId", generationId);
}

export async function getAllDownloads(): Promise<DownloadRecord[]> {
  const db = await getDB();
  const all = await db.getAll("downloads");
  return all.sort(
    (a, b) =>
      new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
  );
}

// ============================================
// Aggregation Queries
// ============================================

export async function getGenerationCount(): Promise<{
  images: number;
  videos: number;
  total: number;
}> {
  const db = await getDB();
  const all = await db.getAll("generations");
  const images = all.filter((r) => r.type === "image").length;
  const videos = all.filter((r) => r.type === "video").length;
  return { images, videos, total: all.length };
}

export async function getTotalCost(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("usage");
  return all.reduce((sum, record) => sum + record.cost, 0);
}

export async function getCostByModel(): Promise<Record<string, number>> {
  const db = await getDB();
  const all = await db.getAll("usage");
  return all.reduce(
    (acc, record) => {
      acc[record.model] = (acc[record.model] || 0) + record.cost;
      return acc;
    },
    {} as Record<string, number>
  );
}

// ============================================
// Export All Data (for project export)
// ============================================

export async function exportAllData(): Promise<{
  generations: GenerationRecord[];
  usage: UsageRecord[];
  downloads: DownloadRecord[];
}> {
  const db = await getDB();
  const generations = await db.getAll("generations");
  const usage = await db.getAll("usage");
  const downloads = await db.getAll("downloads");
  return { generations, usage, downloads };
}

// ============================================
// Import Data (for project import)
// ============================================

export async function importData(data: {
  generations?: GenerationRecord[];
  usage?: UsageRecord[];
  downloads?: DownloadRecord[];
}): Promise<void> {
  const db = await getDB();

  if (data.generations) {
    const tx = db.transaction("generations", "readwrite");
    for (const record of data.generations) {
      await tx.store.put(record);
    }
    await tx.done;
  }

  if (data.usage) {
    const tx = db.transaction("usage", "readwrite");
    for (const record of data.usage) {
      await tx.store.put(record);
    }
    await tx.done;
  }

  if (data.downloads) {
    const tx = db.transaction("downloads", "readwrite");
    for (const record of data.downloads) {
      await tx.store.put(record);
    }
    await tx.done;
  }
}
