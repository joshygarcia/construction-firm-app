"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, FileText, ImageIcon, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReceiptUploadProps {
  transactionId: string;
  currentReceiptPath: string | null;
}

export function ReceiptUpload({
  transactionId,
  currentReceiptPath,
}: ReceiptUploadProps) {
  const [receiptPath, setReceiptPath] = useState(currentReceiptPath);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = receiptPath?.endsWith(".pdf");
  const receiptUrl = receiptPath ? `/api/receipts/${receiptPath}` : null;

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("transactionId", transactionId);

        const res = await fetch("/api/receipts/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Error al subir el archivo.");
          return;
        }

        setReceiptPath(data.path);
      } catch {
        setError("Error de conexión al subir el archivo.");
      } finally {
        setUploading(false);
      }
    },
    [transactionId],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Current receipt preview */}
      {receiptPath && receiptUrl && (
        <div className="flex items-center gap-2">
          {isPdf ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileText className="size-4" />
              Ver recibo (PDF)
            </a>
          ) : (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt="Recibo"
                className="h-16 w-16 rounded-md border object-cover"
              />
            </a>
          )}
          <Badge variant="secondary">
            <ImageIcon className="size-3" />
            Recibo adjunto
          </Badge>
        </div>
      )}

      {/* Upload controls */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <FileUp className="size-4" />
              {receiptPath ? "Cambiar recibo" : "Subir recibo"}
            </>
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <X className="size-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
