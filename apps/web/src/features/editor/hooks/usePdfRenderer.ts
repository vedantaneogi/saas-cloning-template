"use client";

import { useEffect, useRef, useState } from "react";

interface PdfPage {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
}

export function usePdfRenderer(pdfUrl: string | null) {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdf = await pdfjsLib.getDocument(pdfUrl!).promise;
        const pageCount = pdf.numPages;

        const pageInfos: PdfPage[] = [];

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          pageInfos.push({
            pageNumber: i,
            canvas: null,
            width: viewport.width,
            height: viewport.height,
          });
        }

        if (!cancelled) {
          setPages(pageInfos);
          setIsLoading(false);

          // Render each page
          for (let i = 1; i <= pageCount; i++) {
            const canvas = canvasRefs.current.get(i);
            if (!canvas) continue;

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load PDF");
          setIsLoading(false);
        }
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  const setCanvasRef = (pageNumber: number) => (el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNumber, el);
    }
  };

  return { pages, isLoading, error, setCanvasRef };
}
