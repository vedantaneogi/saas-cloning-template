"use client";

import { useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/features/auth/store";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createEnvelope, uploadDocument, addRecipient, sendEnvelope, getEnvelope } from "@/features/envelopes/api";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import {
  PaperPlaneRight,
  PencilSimpleLine,
  EnvelopeSimple,
  Signature,
  Layout,
  FileText,
  UploadSimple,
  CaretDown,
  CaretRight,
  X,
  CloudArrowUp,
  Desktop,
} from "@phosphor-icons/react";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const SIGN_PRIMARY = "#4C00FF";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SignDocumentModalProps {
  onClose: () => void;
}

function SignDocumentModal({ onClose }: SignDocumentModalProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { toasts, addToast, dismissToast } = useToast();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadedFile(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleFiles(files);
    // Reset so re-selecting the same file triggers onChange
    e.target.value = "";
  };

  const STEPS = [
    "Creating envelope…",
    "Uploading document…",
    "Adding you as signer…",
    "Sending envelope…",
    "Getting signing link…",
    "Redirecting…",
  ];

  const handleSign = async () => {
    if (!uploadedFile || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      setCurrentStep(STEPS[0]);
      setProgress(10);
      const fileName = uploadedFile.name.replace(/\.[^/.]+$/, "");
      const envelope = await createEnvelope({ subject: fileName, recipients: [] });
      setProgress(20);

      setCurrentStep(STEPS[1]);
      setProgress(30);
      await uploadDocument(envelope.id, uploadedFile);
      setProgress(50);

      setCurrentStep(STEPS[2]);
      setProgress(60);
      await addRecipient(envelope.id, {
        name: user?.name ?? "Me",
        email: user?.email ?? "",
        role: "signer",
        routing_order: 1,
      });
      setProgress(70);

      setCurrentStep(STEPS[3]);
      setProgress(80);
      await sendEnvelope(envelope.id);
      setProgress(88);

      setCurrentStep(STEPS[4]);
      const fresh = await getEnvelope(envelope.id);
      const signingToken = fresh.recipients?.[0]?.signing_token;
      setProgress(96);

      if (!signingToken) {
        throw new Error("Signing link not available. Please check your Agreements page.");
      }

      setCurrentStep(STEPS[5]);
      setProgress(100);
      router.push(`/sign/${signingToken}`);
    } catch (err) {
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep("");
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      addToast(message, "error");
    }
  };

  const CLOUD_PROVIDERS = [
    { label: "Box", comingSoon: true },
    { label: "Dropbox", comingSoon: true },
    { label: "Google Drive", comingSoon: true },
    { label: "OneDrive", comingSoon: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 8px 40px rgba(19,0,50,0.22)",
            width: "100%",
            maxWidth: "640px",
            fontFamily: DS_FONT,
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px 16px",
              borderBottom: "1px solid rgba(19,0,50,0.08)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "rgba(19,0,50,0.9)", fontFamily: DS_FONT }}>
              Sign a document
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "rgba(19,0,50,0.5)",
                display: "flex",
                alignItems: "center",
                borderRadius: "4px",
              }}
              aria-label="Close"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "24px" }}>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                background: isDragging ? "rgba(76,0,255,0.04)" : "#F7F7F7",
                border: `2px dashed ${isDragging ? SIGN_PRIMARY : "rgba(19,0,50,0.18)"}`,
                borderRadius: "6px",
                padding: "40px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
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
                <CloudArrowUp size={24} weight="bold" color="rgba(19,0,50,0.6)" />
              </div>

              <p style={{ margin: 0, fontSize: "15px", color: "rgba(19,0,50,0.75)", textAlign: "center" }}>
                Drop your files here or
              </p>

              {/* Upload dropdown */}
              <div className="relative">
                <button
                  style={{
                    background: SIGN_PRIMARY,
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    fontSize: "15px",
                    fontWeight: 500,
                    padding: "8px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: DS_FONT,
                  }}
                  onClick={() => setUploadDropdownOpen((o) => !o)}
                  disabled={isProcessing}
                >
                  Upload
                  <CaretDown size={13} weight="bold" color="white" />
                </button>

                {uploadDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUploadDropdownOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "calc(100% + 4px)",
                        background: "#fff",
                        border: "1px solid #E0E0E0",
                        borderRadius: "4px",
                        boxShadow: "0 4px 16px rgba(19,0,50,0.12)",
                        minWidth: "220px",
                        zIndex: 20,
                        padding: "4px 0",
                      }}
                    >
                      {/* Desktop — works */}
                      <button
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          padding: "10px 16px",
                          fontSize: "14px",
                          color: "#1B0A3C",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontFamily: DS_FONT,
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                        onClick={() => {
                          fileInputRef.current?.click();
                          setUploadDropdownOpen(false);
                        }}
                      >
                        <Desktop size={18} weight="bold" color="#555" />
                        Desktop
                      </button>

                      {/* Divider */}
                      <div style={{ height: "1px", background: "#F0F0F0", margin: "4px 0" }} />

                      {CLOUD_PROVIDERS.map((p) => (
                        <button
                          key={p.label}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: "#1B0A3C",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontFamily: DS_FONT,
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                          onClick={() => {
                            setUploadDropdownOpen(false);
                            addToast(`${p.label} integration coming soon`, "success");
                          }}
                        >
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={handleFileInputChange}
              />
            </div>

            {/* Uploaded file display */}
            {uploadedFile && !isProcessing && (
              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  background: "#fff",
                  border: "1px solid rgba(19,0,50,0.12)",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "rgba(76,0,255,0.08)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} weight="regular" color={SIGN_PRIMARY} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "rgba(19,0,50,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {uploadedFile.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "rgba(19,0,50,0.4)" }}>
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "rgba(19,0,50,0.35)",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                    flexShrink: 0,
                  }}
                  aria-label="Remove file"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            )}

            {/* Progress bar */}
            {isProcessing && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: `2px solid ${SIGN_PRIMARY}`,
                      borderTopColor: "transparent",
                      flexShrink: 0,
                      animation: "wh-spin 0.7s linear infinite",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "rgba(19,0,50,0.6)", fontFamily: DS_FONT }}>
                    {currentStep}
                  </span>
                </div>
                <div
                  style={{
                    height: "5px",
                    borderRadius: "999px",
                    background: "rgba(76,0,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: SIGN_PRIMARY,
                      borderRadius: "999px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              padding: "16px 24px",
              borderTop: "1px solid rgba(19,0,50,0.08)",
            }}
          >
            <button
              onClick={onClose}
              disabled={isProcessing}
              style={{
                background: "none",
                border: "1px solid rgba(19,0,50,0.2)",
                borderRadius: "4px",
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(19,0,50,0.7)",
                cursor: isProcessing ? "not-allowed" : "pointer",
                fontFamily: DS_FONT,
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSign}
              disabled={!uploadedFile || isProcessing}
              style={{
                background: !uploadedFile || isProcessing ? "rgba(76,0,255,0.35)" : SIGN_PRIMARY,
                border: "none",
                borderRadius: "4px",
                padding: "8px 24px",
                fontSize: "14px",
                fontWeight: 500,
                color: "white",
                cursor: !uploadedFile || isProcessing ? "not-allowed" : "pointer",
                fontFamily: DS_FONT,
                transition: "background 0.15s",
              }}
            >
              Sign
            </button>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <style>{`
        @keyframes wh-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

const heroButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "0.625px solid rgba(255, 255, 255, 0.5)",
  borderRadius: "4px",
  color: "white",
  height: "40px",
  fontSize: "16px",
  fontWeight: 500,
  paddingLeft: "16px",
  paddingRight: "16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "background 0.15s",
  whiteSpace: "nowrap" as const,
};

export function WelcomeHero() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.name ?? "there";
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [envelopesHovered, setEnvelopesHovered] = useState(false);
  const [templatesHovered, setTemplatesHovered] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);

  const createEnvelopeMutation = useMutation({
    mutationFn: () =>
      createEnvelope({ subject: "New Envelope", recipients: [] }),
    onSuccess: (envelope) => {
      router.push(`/envelope/${envelope.id}/prepare`);
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: () =>
      createEnvelope({ subject: "Untitled Template", message: "", recipients: [] }),
    onSuccess: (envelope) => {
      router.push(`/envelope/${envelope.id}/prepare?mode=template`);
    },
    onError: () => {
      alert("Failed to start template creation. Please try again.");
    },
  });

  return (
    <>
    <div
      className="flex flex-col items-center justify-center px-6"
      style={{
        background: "radial-gradient(106.11% 145.09% at 50% -23.62%, rgb(66, 0, 202) 0%, rgb(38, 5, 89) 100%)",
        color: "white",
        width: "100%",
        height: "280px",
      }}
    >
      {/* Welcome heading */}
      <h1
        className="text-center mb-6"
        style={{ fontSize: "24px", fontWeight: 400, color: "white", lineHeight: "30px" }}
      >
        Welcome back, {displayName}
      </h1>

      {/* 4 action buttons in a row */}
      <div className="flex items-center gap-3 flex-wrap justify-center">

        {/* Start ▼ cascading dropdown — solid white background, purple text */}
        <div className="relative">
          <button
            onClick={() => setStartOpen(!startOpen)}
            style={{
              background: "#CAC2FF",
              border: "none",
              borderRadius: "4px",
              color: "rgba(19,0,50,0.9)",
              height: "40px",
              fontSize: "16px",
              fontWeight: 500,
              paddingLeft: "12px",
              paddingRight: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "background 0.15s",
              whiteSpace: "nowrap" as const,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "#b8adff")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "#CAC2FF")
            }
          >
            Start
            <CaretDown size={14} weight="bold" />
          </button>

          {startOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setStartOpen(false);
                  setEnvelopesHovered(false);
                  setTemplatesHovered(false);
                }}
              />
              <div
                className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-2"
                style={{ borderColor: "#E0E0E0", minWidth: "220px" }}
              >
                {/* Agreements section */}
                <div
                  className="px-4 py-1"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6B7280",
                  }}
                >
                  Agreements
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => setEnvelopesHovered(true)}
                  onMouseLeave={() => setEnvelopesHovered(false)}
                >
                  <button
                    className="flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    style={{ color: "#1B0A3C", background: envelopesHovered ? "#F9F9F9" : "transparent" }}
                  >
                    <span className="flex items-center gap-2">
                      <EnvelopeSimple size={14} weight="bold" />
                      Envelopes
                    </span>
                    <CaretRight size={14} weight="bold" />
                  </button>

                  {/* Envelopes sub-menu */}
                  {envelopesHovered && (
                    <div
                      className="absolute left-full top-0 bg-white rounded shadow-lg border z-30 py-2"
                      style={{ borderColor: "#E0E0E0", minWidth: "200px" }}
                    >
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setEnvelopesHovered(false);
                          createEnvelopeMutation.mutate();
                        }}
                        disabled={createEnvelopeMutation.isPending}
                      >
                        <EnvelopeSimple size={14} weight="bold" />
                        Get Signatures
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setEnvelopesHovered(false);
                          setSignModalOpen(true);
                        }}
                      >
                        <Signature size={14} weight="bold" />
                        Sign a Document
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setEnvelopesHovered(false);
                          router.push("/templates");
                        }}
                      >
                        <Layout size={14} weight="bold" />
                        Use a Template
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div
                  className="my-2 mx-4 border-t"
                  style={{ borderColor: "#F0F0F0" }}
                />

                {/* Templates section */}
                <div
                  className="px-4 py-1"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6B7280",
                  }}
                >
                  Templates
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => setTemplatesHovered(true)}
                  onMouseLeave={() => setTemplatesHovered(false)}
                >
                  <button
                    className="flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    style={{ color: "#1B0A3C", background: templatesHovered ? "#F9F9F9" : "transparent" }}
                  >
                    <span className="flex items-center gap-2">
                      <Layout size={14} weight="bold" />
                      Envelope Templates
                    </span>
                    <CaretRight size={14} weight="bold" />
                  </button>

                  {/* Sub-menu */}
                  {templatesHovered && (
                    <div
                      className="absolute left-full top-0 bg-white rounded shadow-lg border z-30 py-2"
                      style={{ borderColor: "#E0E0E0", minWidth: "220px" }}
                    >
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setTemplatesHovered(false);
                          createTemplateMutation.mutate();
                        }}
                        disabled={createTemplateMutation.isPending}
                      >
                        <FileText size={14} weight="bold" />
                        Create an Envelope Template
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setTemplatesHovered(false);
                          alert("Coming soon");
                        }}
                      >
                        <UploadSimple size={14} weight="bold" />
                        Upload a Template
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Get Signatures */}
        <button
          onClick={() => createEnvelopeMutation.mutate()}
          style={heroButtonStyle}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <PaperPlaneRight size={18} weight="bold" />
          Get Signatures
        </button>

        {/* Create an Envelope Template */}
        <button
          onClick={() => createTemplateMutation.mutate()}
          disabled={createTemplateMutation.isPending}
          style={heroButtonStyle}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Layout size={18} weight="bold" />
          Create an Envelope Template
        </button>

        {/* Sign a Document */}
        <button
          onClick={() => setSignModalOpen(true)}
          style={heroButtonStyle}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <PencilSimpleLine size={18} weight="bold" />
          Sign a Document
        </button>

      </div>
    </div>

    {signModalOpen && (
      <SignDocumentModal onClose={() => setSignModalOpen(false)} />
    )}
    </>
  );
}
