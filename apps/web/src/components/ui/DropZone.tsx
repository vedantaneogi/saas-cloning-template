"use client";

import { DragEvent, useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({ onFiles, accept = ".pdf", multiple = true, className, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (accept) {
      const acceptParts = accept.split(",").map((a) => a.trim().toLowerCase());
      const exts = acceptParts.filter((a) => a.startsWith("."));
      const mimes = acceptParts.filter((a) => !a.startsWith(".") && a.includes("/"));
      const filtered = files.filter((f) => {
        const dotIdx = f.name.lastIndexOf(".");
        const ext = dotIdx >= 0 ? f.name.slice(dotIdx).toLowerCase() : "";
        if (ext && exts.includes(ext)) return true;
        if (f.type && mimes.includes(f.type.toLowerCase())) return true;
        return exts.length === 0 && mimes.length === 0;
      });
      if (filtered.length === 0) {
        alert(`Only ${exts.join(", ")} files are accepted.`);
        return;
      }
      onFiles(filtered);
    } else {
      onFiles(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-[#1B0A3C] bg-gray-100"
          : "border-[#E0E0E0] hover:border-[#1B0A3C] hover:bg-gray-50",
        className,
      )}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      {children ?? (
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
            <UploadSimple size={24} color="#1B0A3C" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#1B0A3C" }}>
              Drag and drop files here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or <span className="text-[#1B0A3C] font-medium">browse to upload</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports PDF and Word documents
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
