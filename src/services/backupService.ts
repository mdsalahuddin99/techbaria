import { apiFetch } from "@/shared/api-client/fetch";

const BASE = "/api/backup";

export interface BackupFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
}

export const createBackup = (): Promise<BackupFile> =>
  apiFetch<BackupFile>(BASE, { method: "POST" });

export const listBackups = (): Promise<BackupFile[]> =>
  apiFetch<BackupFile[]>(BASE);

export const downloadBackup = (id: string): Promise<void> =>
  apiFetch<void>(`${BASE}/${id}/download`, { method: "GET" });

export const restoreBackup = (id: string): Promise<void> =>
  apiFetch<void>(`${BASE}/${id}/restore`, { method: "POST" });

export const deleteBackup = (id: string): Promise<void> =>
  apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });

export const wipeAllCloudData = (): Promise<void> =>
  apiFetch<void>(`${BASE}/wipe`, { method: "DELETE" });

/** Export all shop data as JSON and trigger a file download. */
export async function exportFullJson(): Promise<void> {
  const res = await fetch("/api/backup/export");
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const data = await res.json();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shebatech-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
