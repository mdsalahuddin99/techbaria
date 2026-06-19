/** Convert an array of objects to CSV and trigger a browser download. */
export function downloadCsv<T extends object>(
  rows: T[],
  filename: string,
  columns?: Array<keyof T>
) {
  if (rows.length === 0) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, filename);
    return;
  }
  const cols = (columns ?? (Object.keys(rows[0]) as Array<keyof T>)) as Array<keyof T>;
  const header = cols.map((c) => escapeCsv(String(c))).join(",");
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const v = (r as Record<string, unknown>)[c as string];
        if (v == null) return "";
        if (typeof v === "object") return escapeCsv(JSON.stringify(v));
        return escapeCsv(String(v));
      })
      .join(",")
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
