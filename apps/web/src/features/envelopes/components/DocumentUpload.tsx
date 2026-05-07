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
    const allowedExts = [".pdf", ".doc", ".docx"];
    const maxSize = 10 * 1024 * 1024;
    const valid = files.filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) return false;
      if (f.size > maxSize) return false;
      return true;
    });
    if (valid.length === 0 && files.length > 0) {
      alert("Only PDF and Word documents (max 10MB) are accepted.");
      return;
    }
    if (valid.length < files.length) {
      alert(`${files.length - valid.length} file(s) were skipped — only PDF and Word documents (max 10MB) are accepted.`);
    }
    const newDocs: UploadedDocument[] = valid.map((file) => ({
      id: crypto.randomUUID(),
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
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
