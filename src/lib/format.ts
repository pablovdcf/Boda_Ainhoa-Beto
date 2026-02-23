export function normalizeStatus(status: string): "si" | "no" | "pendiente" {
  const norm = String(status || "").toLowerCase();
  if (norm === "si") return "si";
  if (norm === "no") return "no";
  return "pendiente";
}

export function statusLabel(status: string): string {
  const norm = normalizeStatus(status);
  if (norm === "si") return "Sí";
  if (norm === "no") return "No";
  return "Pendiente";
}

export function statusTone(
  status: string
): "neutral" | "success" | "warning" | "danger" {
  const norm = normalizeStatus(status);
  if (norm === "si") return "success";
  if (norm === "no") return "danger";
  return "warning";
}

export function toCsv(
  rows: Array<Record<string, unknown>>,
  headers: string[],
  delimiter = ",",
  withBom = true
): string {
  const escapeCell = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escapeCell).join(delimiter),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(delimiter))
  ];
  const content = lines.join("\r\n");
  return withBom ? `\uFEFF${content}` : content;
}

