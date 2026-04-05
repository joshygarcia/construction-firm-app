import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import { getReceiptsDir } from "@/features/finance/paths";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  const filePath = join(getReceiptsDir(), filename);

  if (!existsSync(filePath)) {
    return new Response("Archivo no encontrado.", { status: 404 });
  }

  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  const fileBuffer = readFileSync(filePath);

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
