"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { X, UploadSimple } from "@phosphor-icons/react";

interface SignatureCaptureProps {
  open: boolean;
  onClose: () => void;
  onAdopt: (signatureDataUrl: string) => void;
  signerName: string;
  mode?: "signature" | "initial";
}

type TabId = "type" | "draw" | "upload";

const SIGNATURE_FONTS = [
  {
    id: "dancing",
    label: "Style 1",
    style: "'Dancing Script', 'Brush Script MT', cursive",
  },
  {
    id: "pacifico",
    label: "Style 2",
    style: "'Pacifico', 'Comic Sans MS', cursive",
  },
  {
    id: "satisfy",
    label: "Style 3",
    style: "'Satisfy', 'Segoe Script', cursive",
  },
  {
    id: "allura",
    label: "Style 4",
    style: "'Allura', 'Monotype Corsiva', cursive",
  },
];

export function SignatureCapture({
  open,
  onClose,
  onAdopt,
  signerName,
  mode = "signature",
}: SignatureCaptureProps) {
  const [tab, setTab] = useState<TabId>("type");
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [penColor, setPenColor] = useState("#1B0A3C");
  const [penSize, setPenSize] = useState(2.5);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setTab("type");
      setTypedName(signerName);
      setSelectedFont(SIGNATURE_FONTS[0]);
      setUploadedImage(null);
      setHasDrawn(false);
    }
  }, [open, signerName]);

  // Setup canvas when switching to draw tab
  useEffect(() => {
    if (tab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      setHasDrawn(false);
    }
  }, [tab, penColor, penSize]);

  const getCanvasPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    const pos = getCanvasPos(
      "touches" in e ? (e.nativeEvent as TouchEvent) : (e.nativeEvent as MouseEvent),
      canvasRef.current,
    );
    lastPosRef.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current || !canvasRef.current || !lastPosRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(
      "touches" in e ? (e.nativeEvent as TouchEvent) : (e.nativeEvent as MouseEvent),
      canvasRef.current,
    );

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    setHasDrawn(true);
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
  };

  // Convert typed signature to canvas data URL
  const typeToDataUrl = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = penColor;
    ctx.font = `48px ${selectedFont.style}`;
    ctx.textBaseline = "middle";
    ctx.fillText(typedName || "Signature", 20, canvas.height / 2);
    return canvas.toDataURL();
  };

  const canAdopt = (): boolean => {
    if (tab === "type") return (typedName || "").trim().length > 0;
    if (tab === "draw") return hasDrawn;
    if (tab === "upload") return !!uploadedImage;
    return false;
  };

  const handleAdopt = () => {
    let dataUrl = "";
    if (tab === "type") {
      dataUrl = typeToDataUrl();
    } else if (tab === "draw" && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL();
    } else if (tab === "upload" && uploadedImage) {
      dataUrl = uploadedImage;
    }
    onAdopt(dataUrl);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "type", label: "Type" },
    { id: "draw", label: "Draw" },
    { id: "upload", label: "Upload" },
  ];

  const displayName = mode === "initial"
    ? (typedName || "")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : typedName || "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "initial" ? "Adopt Your Initials" : "Adopt Your Signature"}
      size="lg"
    >
      {/* Tabs */}
      <div className="flex border-b -mx-6 px-6 mb-5" style={{ borderColor: "#E8E8E8" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px"
            style={{
              borderColor: tab === t.id ? "#1B0A3C" : "transparent",
              color: tab === t.id ? "#1B0A3C" : "#6B6B6B",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TYPE tab */}
      {tab === "type" && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all"
              style={{ borderColor: "#E0E0E0" }}
              onFocus={(e) => {
                e.target.style.borderColor = "#1B0A3C";
                e.target.style.boxShadow = "0 0 0 3px rgba(27,10,60,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#E0E0E0";
                e.target.style.boxShadow = "none";
              }}
              placeholder="Type your full name"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wider">
              Select Style
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SIGNATURE_FONTS.map((font) => {
                const isSelected = selectedFont.id === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font)}
                    className="p-3 rounded-lg border-2 text-left transition-all hover:border-gray-300"
                    style={{
                      borderColor: isSelected ? "#1B0A3C" : "#E8E8E8",
                      background: isSelected ? "#F0F0F0" : "white",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: font.style,
                        fontSize: "20px",
                        color: "#1B0A3C",
                        display: "block",
                        lineHeight: 1.4,
                      }}
                    >
                      {displayName || "Signature"}
                    </span>
                    <span className="text-xs text-gray-400 mt-1 block">{font.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-5"
            style={{ background: "#FAFAFA", border: "1px solid #F0F0F0" }}
          >
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Preview</p>
            <div
              className="pb-3 border-b-2"
              style={{ borderColor: "#1B0A3C" }}
            >
              <span
                style={{
                  fontFamily: selectedFont.style,
                  fontSize: "36px",
                  color: "#1B0A3C",
                  display: "block",
                  lineHeight: 1.3,
                  minHeight: "48px",
                }}
              >
                {displayName || " "}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {mode === "initial" ? "Initials" : "Signature"}
            </p>
          </div>
        </div>
      )}

      {/* DRAW tab */}
      {tab === "draw" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600 flex-1">Draw your {mode === "initial" ? "initials" : "signature"} below</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Color:</span>
              {["#1B0A3C", "#1565C0", "#000000"].map((color) => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{
                    background: color,
                    borderColor: penColor === color ? "#1B0A3C" : "transparent",
                    outline: penColor === color ? "2px solid #1B0A3C" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Size:</span>
              {[1.5, 2.5, 4].map((size) => (
                <button
                  key={size}
                  onClick={() => setPenSize(size)}
                  className="w-6 h-6 rounded flex items-center justify-center border transition-all"
                  style={{
                    borderColor: penSize === size ? "#1B0A3C" : "#E0E0E0",
                    background: penSize === size ? "#F0F0F0" : "white",
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{ width: size + 2, height: size + 2, background: "#1B0A3C" }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Draw canvas */}
          <div
            className="relative rounded-xl overflow-hidden border-2"
            style={{ borderColor: hasDrawn ? "#E0E0E0" : "#1B0A3C" }}
          >
            <canvas
              ref={canvasRef}
              width={560}
              height={200}
              className="w-full cursor-crosshair"
              style={{ touchAction: "none", display: "block" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {/* Baseline */}
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: "30px",
                left: "5%",
                right: "5%",
                height: "1px",
                background: "#E0E0E0",
              }}
            />
            {!hasDrawn && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ color: "#CCCCCC" }}
              >
                <p className="text-sm">Sign here</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={14} weight="regular" />
              Clear
            </button>
            <p className="text-xs text-gray-400">Draw freely to create your signature</p>
          </div>
        </div>
      )}

      {/* UPLOAD tab */}
      {tab === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Upload an image of your handwritten signature (PNG, JPG, or GIF)</p>

          {uploadedImage ? (
            <div className="space-y-3">
              <div
                className="rounded-xl border-2 p-4 flex items-center justify-center"
                style={{ borderColor: "#E0E0E0", minHeight: "120px" }}
              >
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-24 object-contain"
                />
              </div>
              <button
                onClick={() => setUploadedImage(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Remove and upload different image
              </button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-[#1B0A3C] hover:bg-[#FAFAFF]"
              style={{ borderColor: "#E0E0E0" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimple size={40} weight="regular" color="#9E9E9E" className="mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">Click to upload signature image</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF — transparent background preferred</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-6 pt-5 border-t flex items-center justify-between"
        style={{ borderColor: "#E8E8E8" }}
      >
        <p className="text-xs text-gray-400 flex-1 pr-4 leading-relaxed">
          By clicking &ldquo;Adopt and Sign&rdquo;, you agree that this signature represents your
          legally binding electronic signature.
        </p>
        <div className="flex gap-2.5 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm border font-medium transition-colors"
            style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Cancel
          </button>
          <button
            onClick={handleAdopt}
            disabled={!canAdopt()}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: "#F59E0B", color: "#1B0A3C" }}
            onMouseOver={(e) => { if (canAdopt()) e.currentTarget.style.background = "#D97706"; }}
            onMouseOut={(e) => (e.currentTarget.style.background = "#F59E0B")}
          >
            Adopt and Sign
          </button>
        </div>
      </div>
    </Dialog>
  );
}
