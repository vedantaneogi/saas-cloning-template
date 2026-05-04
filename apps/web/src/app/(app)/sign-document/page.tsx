"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadSimple, CaretDown, Desktop } from "@phosphor-icons/react";
import { useAuthStore } from "@/features/auth/store";
import {
  createEnvelope,
  uploadDocument,
  addRecipient,
  sendEnvelope,
  getEnvelope,
} from "@/features/envelopes/api";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_COLOR = "#4C00FF";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";

const STEPS = [
  "Creating envelope…",
  "Uploading document…",
  "Adding you as signer…",
  "Sending envelope…",
  "Getting signing link…",
  "Redirecting…",
];

export default function SignDocumentPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;

      const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
        setError("Please upload a PDF, DOC, or DOCX file.");
        return;
      }

      setError(null);
      setIsProcessing(true);
      setProgress(0);

      try {
        // Step 1: Create envelope
        setCurrentStep(STEPS[0]);
        setProgress(10);
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const envelope = await createEnvelope({ subject: fileName, recipients: [] });
        setProgress(20);

        // Step 2: Upload document
        setCurrentStep(STEPS[1]);
        setProgress(30);
        await uploadDocument(envelope.id, file);
        setProgress(50);

        // Step 3: Add self as signer
        setCurrentStep(STEPS[2]);
        setProgress(60);
        await addRecipient(envelope.id, {
          name: user?.name ?? "Me",
          email: user?.email ?? "",
          role: "signer",
          routing_order: 1,
        });
        setProgress(70);

        // Step 4: Send envelope
        setCurrentStep(STEPS[3]);
        setProgress(80);
        await sendEnvelope(envelope.id);
        setProgress(88);

        // Step 5: Get signing token
        setCurrentStep(STEPS[4]);
        const fresh = await getEnvelope(envelope.id);
        const signingToken = fresh.recipients?.[0]?.signing_token;
        setProgress(96);

        if (!signingToken) {
          throw new Error("Signing link not available. The envelope may still be processing — please check your Agreements page.");
        }

        // Step 6: Redirect
        setCurrentStep(STEPS[5]);
        setProgress(100);
        router.push(`/sign/${signingToken}`);
      } catch (err) {
        setIsProcessing(false);
        setProgress(0);
        setCurrentStep("");
        const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(message);
      }
    },
    [user, router],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#F8F7FC", fontFamily: DS_FONT }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6"
        style={{
          height: "56px",
          background: "#fff",
          borderBottom: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2 transition-colors"
          style={{ color: PRIMARY_TEXT, background: "none", border: "none", cursor: "pointer", fontFamily: DS_FONT, fontSize: "14px" }}
          onMouseOver={(e) => (e.currentTarget.style.color = PRIMARY_COLOR)}
          onMouseOut={(e) => (e.currentTarget.style.color = PRIMARY_TEXT)}
        >
          <ArrowLeft size={16} weight="bold" />
          Back
        </button>
        <span style={{ fontWeight: 600, fontSize: "15px", color: PRIMARY_TEXT }}>
          Sign a Document
        </span>
        {/* Spacer to center title */}
        <div style={{ width: "64px" }} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className="w-full max-w-lg"
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: `1px solid ${BORDER_COLOR}`,
            boxShadow: "0 2px 12px rgba(19,0,50,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              padding: "56px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              cursor: "default",
              transition: "background 0.15s",
              background: isDragging ? "rgba(76,0,255,0.04)" : "transparent",
              borderBottom: error ? `1px solid ${BORDER_COLOR}` : "none",
            }}
          >
            {/* Upload icon */}
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "rgba(19,0,50,0.08)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UploadSimple size={32} color="rgba(19,0,50,0.7)" />
            </div>

            <p style={{ fontSize: "16px", color: PRIMARY_TEXT, margin: 0 }}>
              Drop your files here or
            </p>

            {/* Upload dropdown button */}
            {!isProcessing && (
              <div className="relative">
                <button
                  className="flex items-center gap-2 font-medium text-white"
                  style={{
                    background: PRIMARY_COLOR,
                    borderRadius: "4px",
                    padding: "8px 20px",
                    fontSize: "16px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: DS_FONT,
                  }}
                  onClick={() => setUploadDropdownOpen((o) => !o)}
                >
                  Upload
                  <CaretDown size={14} weight="bold" color="white" />
                </button>

                {uploadDropdownOpen && (
                  <div
                    className="absolute left-0 mt-1 bg-white rounded shadow-lg z-10 py-1"
                    style={{
                      border: "1px solid #E0E0E0",
                      minWidth: "220px",
                      top: "100%",
                    }}
                  >
                    <button
                      className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer"
                      style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C", background: "none", border: "none", fontFamily: DS_FONT }}
                      onClick={() => {
                        fileInputRef.current?.click();
                        requestAnimationFrame(() => setUploadDropdownOpen(false));
                      }}
                    >
                      <Desktop size={22} weight="bold" color="#555" />
                      Desktop
                    </button>
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: "12px", color: "rgba(19,0,50,0.4)" }}>
              Supported: PDF, DOCX, DOC
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {/* Progress bar + step label */}
          {isProcessing && (
            <div style={{ padding: "0 40px 40px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `2px solid ${PRIMARY_COLOR}`,
                    borderTopColor: "transparent",
                    flexShrink: 0,
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                <span style={{ fontSize: "13px", color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
                  {currentStep}
                </span>
              </div>

              <div
                style={{
                  height: "6px",
                  borderRadius: "999px",
                  background: "rgba(76,0,255,0.12)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: PRIMARY_COLOR,
                    borderRadius: "999px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(19,0,50,0.35)",
                  marginTop: "6px",
                  textAlign: "right",
                  fontFamily: DS_FONT,
                }}
              >
                Preparing your document…
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              style={{
                margin: "0 24px 24px",
                padding: "12px 16px",
                background: "rgba(217,48,37,0.07)",
                border: "1px solid rgba(217,48,37,0.2)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#D93025",
                fontFamily: DS_FONT,
              }}
            >
              {error}
            </div>
          )}

          {/* Divider + hint */}
          {!isProcessing && (
            <div
              style={{
                padding: "0 40px 32px",
                borderTop: `1px solid ${BORDER_COLOR}`,
              }}
            >
              <div
                className="flex items-center gap-3"
                style={{ margin: "24px 0 0" }}
              >
                <div style={{ flex: 1, height: "1px", background: BORDER_COLOR }} />
                <span style={{ fontSize: "12px", color: "rgba(19,0,50,0.35)", fontFamily: DS_FONT }}>
                  or
                </span>
                <div style={{ flex: 1, height: "1px", background: BORDER_COLOR }} />
              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: SECONDARY_TEXT,
                  textAlign: "center",
                  marginTop: "16px",
                  fontFamily: DS_FONT,
                }}
              >
                Need to get others to sign?{" "}
                <button
                  onClick={() => router.push("/agreements")}
                  style={{
                    background: "none",
                    border: "none",
                    color: PRIMARY_COLOR,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    fontFamily: DS_FONT,
                    padding: 0,
                  }}
                >
                  Send for signatures instead
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
