"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Trash, UploadSimple, CornersOut } from "@phosphor-icons/react";

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
    id: "sacramento",
    label: "Budapest",
    style: "'Sacramento', cursive",
  },
  {
    id: "great-vibes",
    label: "Augustia",
    style: "'Great Vibes', cursive",
  },
  {
    id: "pinyon",
    label: "Darcey Oliver",
    style: "'Pinyon Script', cursive",
  },
  {
    id: "satisfy",
    label: "Gloriant",
    style: "'Satisfy', cursive",
  },
  {
    id: "caveat",
    label: "Harris",
    style: "'Caveat', cursive",
  },
  {
    id: "yellowtail",
    label: "Holland",
    style: "'Yellowtail', cursive",
  },
];

const PURPLE = "#4C00FF";
const DARK = "#1B0A3C";

function generateInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function generateDocusignId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const LEGAL_TEXT =
  "By selecting Adopt and Sign, I agree that this mark will be the electronic representation of my signature or initials whenever I use it. I also understand that recipients of electronic documents I sign will be able to see my Docusign ID, which will include my email address.";

export function SignatureCapture({
  open,
  onClose,
  onAdopt,
  signerName,
  mode = "signature",
}: SignatureCaptureProps) {
  const [tab, setTab] = useState<TabId>("type");
  const [fullName, setFullName] = useState(signerName);
  const [initials, setInitials] = useState(generateInitials(signerName));
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const penColor = DARK;
  const penSize = 2.5;
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docusignId = useMemo(() => generateDocusignId(), []);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setTab("type");
      setFullName(signerName);
      setInitials(generateInitials(signerName));
      setSelectedFont(SIGNATURE_FONTS[0]);
      setShowStylePicker(false);
      setUploadedImage(null);
      setHasDrawn(false);
    }
  }, [open, signerName]);

  // Pre-load signature fonts when dialog opens
  useEffect(() => {
    if (open) {
      SIGNATURE_FONTS.forEach((f) => {
        document.fonts.load(`48px ${f.style}`).catch(() => {});
      });
    }
  }, [open]);

  // Auto-update initials when full name changes
  useEffect(() => {
    setInitials(generateInitials(fullName));
  }, [fullName]);

  // Setup canvas when switching to draw tab
  useEffect(() => {
    if (tab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#1B0A3C";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      pointsRef.current = [];
      setHasDrawn(false);
    }
  }, [tab, penColor, penSize]);

  const getCanvasPos = (
    e: MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
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

  const startDraw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    const pos = getCanvasPos(
      "touches" in e
        ? (e.nativeEvent as TouchEvent)
        : (e.nativeEvent as MouseEvent),
      canvasRef.current
    );
    lastPosRef.current = pos;
    pointsRef.current = [{ x: pos.x, y: pos.y }];

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#1B0A3C";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawingRef.current || !canvasRef.current || !lastPosRef.current)
      return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(
      "touches" in e
        ? (e.nativeEvent as TouchEvent)
        : (e.nativeEvent as MouseEvent),
      canvasRef.current
    );

    pointsRef.current.push({ x: pos.x, y: pos.y });
    const pts = pointsRef.current;

    if (pts.length < 3) {
      lastPosRef.current = pos;
      setHasDrawn(true);
      return;
    }

    const p1 = pts[pts.length - 3];
    const p2 = pts[pts.length - 2];
    const p3 = pts[pts.length - 1];
    const cpX = (p1.x + p2.x) / 2;
    const cpY = (p1.y + p2.y) / 2;
    const endX = (p2.x + p3.x) / 2;
    const endY = (p2.y + p3.y) / 2;

    const dx = p3.x - p1.x;
    const dy = p3.y - p1.y;
    const speed = Math.sqrt(dx * dx + dy * dy);
    const width = Math.max(0.5, Math.min(2.5, 3 - speed * 0.05));

    ctx.lineWidth = width;
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, endY);

    lastPosRef.current = pos;
    setHasDrawn(true);
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    pointsRef.current = [];
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    pointsRef.current = [];
    setHasDrawn(false);
  };

  // Convert typed signature to canvas data URL — auto-trimmed to text bounds
  const typeToDataUrl = (): string => {
    const displayText = mode === "initial" ? initials : fullName || "Signature";
    const fontStr = `48px ${selectedFont.style}`;

    // Measure text first
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = fontStr;
    const metrics = measure.measureText(displayText);
    const textW = Math.ceil(metrics.width) + 20;
    const textH = 60;

    // Render on tight canvas
    const canvas = document.createElement("canvas");
    canvas.width = textW;
    canvas.height = textH;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = penColor;
    ctx.font = fontStr;
    ctx.textBaseline = "middle";
    ctx.fillText(displayText, 10, textH / 2);
    return canvas.toDataURL();
  };

  const canAdopt = (): boolean => {
    if (tab === "type") return (fullName || "").trim().length > 0;
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
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPEG, GIF, or BMP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("File size must be under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "type", label: "SELECT STYLE" },
    { id: "draw", label: "DRAW" },
    { id: "upload", label: "UPLOAD" },
  ];

  const displaySignature =
    mode === "initial" ? initials : fullName || "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "initial" ? "Adopt Your Initials" : "Adopt Your Signature"}
      size="xl"
    >
      {/* Subtitle */}
      <p className="text-sm mb-5" style={{ color: "#555" }}>
        Confirm your name, initials, and signature.
      </p>

      {/* Full Name + Initials side by side */}
      <div className="flex gap-4 mb-5">
        <div className="flex-1">
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: DARK }}
          >
            Full Name <span style={{ color: "#E53E3E" }}>*</span>
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm outline-none transition-all"
            style={{ borderColor: "#D1D5DB", color: DARK }}
            onFocus={(e) => {
              e.target.style.borderColor = PURPLE;
              e.target.style.boxShadow = `0 0 0 2px ${PURPLE}22`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#D1D5DB";
              e.target.style.boxShadow = "none";
            }}
            placeholder="Type your full name"
          />
        </div>
        <div style={{ width: "140px" }}>
          <label
            className="block text-xs font-semibold mb-1.5"
            style={{ color: DARK }}
          >
            Initials <span style={{ color: "#E53E3E" }}>*</span>
          </label>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border rounded text-sm outline-none transition-all"
            style={{ borderColor: "#D1D5DB", color: DARK }}
            onFocus={(e) => {
              e.target.style.borderColor = PURPLE;
              e.target.style.boxShadow = `0 0 0 2px ${PURPLE}22`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#D1D5DB";
              e.target.style.boxShadow = "none";
            }}
            placeholder="Initials"
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center border-b mb-5"
        style={{ borderColor: "#E5E7EB" }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id !== "type") setShowStylePicker(false);
            }}
            className="px-4 py-2.5 text-xs font-bold tracking-wider transition-all border-b-2 -mb-px"
            style={{
              borderColor: tab === t.id ? PURPLE : "transparent",
              color: tab === t.id ? PURPLE : "#9CA3AF",
            }}
          >
            {t.label}
          </button>
        ))}

        {/* Change Style link - only on SELECT STYLE tab */}
        {tab === "type" && (
          <button
            onClick={() => setShowStylePicker((v) => !v)}
            className="ml-auto text-xs font-semibold transition-colors"
            style={{ color: PURPLE }}
          >
            {showStylePicker ? "Hide Styles" : "Change Style"}
          </button>
        )}
      </div>

      {/* Tab content area — fixed min-height prevents modal resize on tab switch */}
      <div style={{ minHeight: 320 }}>
      {/* SELECT STYLE tab */}
      {tab === "type" && (
        <div className="space-y-4">
          {/* Style picker (toggled by Change Style) */}
          {showStylePicker && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {SIGNATURE_FONTS.map((font) => {
                const isSelected = selectedFont.id === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => {
                      setSelectedFont(font);
                      setShowStylePicker(false);
                    }}
                    className="p-3 rounded border-2 text-left transition-all hover:border-gray-300"
                    style={{
                      borderColor: isSelected ? PURPLE : "#E5E7EB",
                      background: isSelected ? `${PURPLE}08` : "white",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: font.style,
                        fontSize: "20px",
                        color: DARK,
                        display: "block",
                        lineHeight: 1.4,
                      }}
                    >
                      {displaySignature || "Signature"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {font.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* PREVIEW section */}
          <div>
            <p
              className="text-[10px] font-bold tracking-widest mb-2"
              style={{ color: "#9CA3AF" }}
            >
              PREVIEW
            </p>
            <div
              className="rounded border p-4 flex gap-4"
              style={{ borderColor: "#D1D5DB", background: "#FAFAFA" }}
            >
              {/* Signature preview */}
              <div className="flex-1">
                <p
                  className="text-[10px] mb-1"
                  style={{ color: "#9CA3AF" }}
                >
                  Signed by:
                </p>
                <div
                  className="pb-2 border-b"
                  style={{ borderColor: "#D1D5DB" }}
                >
                  <span
                    style={{
                      fontFamily: selectedFont.style,
                      fontSize: "32px",
                      color: DARK,
                      display: "block",
                      lineHeight: 1.3,
                      minHeight: "42px",
                    }}
                  >
                    {displaySignature || " "}
                  </span>
                </div>
                <p
                  className="text-[10px] mt-1.5 font-mono"
                  style={{ color: "#9CA3AF" }}
                >
                  {docusignId.substring(0, 16)}...
                </p>
              </div>

              {/* DS Initials box */}
              <div
                className="flex-shrink-0 flex flex-col items-center justify-center rounded border px-4 py-3"
                style={{
                  borderColor: "#D1D5DB",
                  background: "white",
                  minWidth: "72px",
                }}
              >
                <p
                  className="text-[10px] font-bold mb-1"
                  style={{ color: "#9CA3AF" }}
                >
                  DS
                </p>
                <span
                  style={{
                    fontFamily: selectedFont.style,
                    fontSize: "22px",
                    color: DARK,
                    lineHeight: 1.2,
                  }}
                >
                  {initials || ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAW tab */}
      {tab === "draw" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Draw your {mode === "initial" ? "initials" : "signature"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={clearCanvas}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                title="Clear"
              >
                <Trash size={18} weight="bold" color="#6B7280" />
              </button>
              <button
                onClick={() => {
                  if (canvasRef.current) {
                    canvasRef.current.requestFullscreen?.();
                  }
                }}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                title="Fullscreen"
              >
                <CornersOut size={18} weight="bold" color="#6B7280" />
              </button>
            </div>
          </div>

          {/* Draw canvas */}
          <div
            className="relative rounded overflow-hidden"
            style={{
              border: "2px dashed #D1D5DB",
            }}
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
                background: "#E5E7EB",
              }}
            />
            {!hasDrawn && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ color: "#D1D5DB" }}
              >
                <p className="text-sm">Sign here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD tab */}
      {tab === "upload" && (
        <div className="space-y-4">
          {uploadedImage ? (
            <div className="space-y-3">
              <div
                className="rounded border-2 p-4 flex items-center justify-center"
                style={{ borderColor: "#D1D5DB", minHeight: "120px" }}
              >
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-24 object-contain"
                />
              </div>
              <button
                onClick={() => {
                  setUploadedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs font-semibold transition-colors"
                style={{ color: PURPLE }}
              >
                Remove and upload different image
              </button>
            </div>
          ) : (
            <div
              className="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-[#1B0A3C] hover:bg-gray-50"
              style={{ borderColor: "#E0E0E0" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                <UploadSimple size={24} color="#1B0A3C" />
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium" style={{ color: "#1B0A3C" }}>
                  Drag and drop files here
                </p>
                <p className="text-xs text-gray-500">
                  or <span className="font-medium" style={{ color: "#1B0A3C" }}>browse to upload</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Accepted: GIF, JPG, PNG, BMP. Max 3MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/bmp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>
      )}
      </div>

      {/* Legal disclaimer */}
      <p
        className="text-[11px] leading-relaxed mt-5"
        style={{ color: "#6B7280" }}
      >
        {LEGAL_TEXT}
      </p>

      {/* Footer */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleAdopt}
          disabled={!canAdopt()}
          className="px-6 py-2.5 rounded text-sm font-bold text-white transition-all disabled:opacity-40"
          style={{ background: PURPLE }}
          onMouseOver={(e) => {
            if (canAdopt())
              e.currentTarget.style.background = "#3D00CC";
          }}
          onMouseOut={(e) => (e.currentTarget.style.background = PURPLE)}
        >
          Adopt and Sign
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ color: "#6B7280" }}
          onMouseOver={(e) =>
            (e.currentTarget.style.color = DARK)
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.color = "#6B7280")
          }
        >
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
