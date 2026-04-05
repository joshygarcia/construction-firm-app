import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { NextResponse } from "next/server";

import { getReceiptsDir } from "@/features/finance/paths";
import { updateTransactionReceipt } from "@/features/finance/store";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const transactionId = formData.get("transactionId");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se proporcionó un archivo." },
        { status: 400 },
      );
    }

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "No se proporcionó el ID de movimiento." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el límite de 10 MB." },
        { status: 400 },
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Use JPG, PNG, WebP o PDF." },
        { status: 400 },
      );
    }

    const receiptsDir = getReceiptsDir();
    if (!existsSync(receiptsDir)) {
      mkdirSync(receiptsDir, { recursive: true });
    }

    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = join(receiptsDir, uniqueName);

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    updateTransactionReceipt(transactionId, uniqueName);

    return NextResponse.json({ path: uniqueName });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al subir el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
