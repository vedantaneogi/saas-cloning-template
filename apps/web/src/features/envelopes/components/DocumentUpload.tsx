"use client";

import { useState } from "react";
import { DropZone } from "@/components/ui/DropZone";
import { FileText, X } from "@phosphor-icons/react";

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onAdd: (docs: UploadedDocument[]) => void;
  onRemove: (id: string) => void;
}

export function DocumentUpload({ documents, onAdd, onRemove }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: File[]) => {
    const newDocs: UploadedDocument[] = files.map((file) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      file,
    }));
    onAdd(newDocs);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <DropZone
        onFiles={handleFiles}
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        multiple
      />

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border"
              style={{ borderColor: "#E0E0E0" }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: "#E8E8F0" }}
              >
                <FileText size={20} weight="regular" color="#1B0A3C" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#1B0A3C" }}>
                  {doc.name}
                </p>
                <p className="text-xs text-gray-400">{formatSize(doc.size)}</p>
              </div>
              <button
                onClick={() => onRemove(doc.id)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} weight="regular" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
