"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { completeSigning, declineSigning, submitFieldValue } from "@/features/signing/api";
import { SignatureCapture } from "./SignatureCapture";
import { FieldNavigator } from "./FieldNavigator";
import { DeclineDialog } from "./DeclineDialog";
import { SigningField } from "./SigningField";
import type { Envelope } from "@/features/envelopes/types";
import type { PlacedField } from "@/features/editor/model/types";
import { Check, X as PhosphorX } from "@phosphor-icons/react";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

interface SigningCeremonyProps {
  token: string;
  envelope: Envelope;
  recipientId: string;
  fields: PlacedField[];
  /** The access code the signer already verified — passed to the backend /complete
   *  call so the backend can enforce the gate independently of the frontend UI. */
  accessCode?: string;
}

type SigningStatus = "signing" | "completed" | "declined";

export function SigningCeremony({ token, envelope, recipientId, fields, accessCode }: SigningCeremonyProps) {
  const [status, setStatus] = useState<SigningStatus>("signing");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    // Seed pre-filled values set by the sender (field.value)
    const initial: Record<string, string> = {};
    for (const f of fields) {
      if (f.value) initial[f.id] = f.value;
    }
    return initial;
  });
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"signature" | "initial">("signature");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [currentNavIndex, setCurrentNavIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const documentRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Separate my fields vs other fields
  const myFields = fields.filter((f) => f.recipientId === recipientId);
  const requiredMyFields = myFields.filter((f) => f.required);

  const completedCount = requiredMyFields.filter((f) => !!fieldValues[f.id]).length;
  // Consider complete when all required fields are filled, OR when there are no required fields
  // (document with only optional fields or no fields at all can still be finished).
  const isComplete =
    requiredMyFields.length === 0
      ? hasStarted
      : completedCount >= requiredMyFields.length;

  // Scroll to a field
  const scrollToField = useCallback((fieldId: string) => {
    const fieldEl = fieldRefs.current.get(fieldId);
    if (fieldEl) {
      fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setActiveFieldId(fieldId);
  }, []);

  // Handle navigator next
  const handleNext = useCallback(() => {
    const currentField = requiredMyFields[currentNavIndex];

    // Try to interact with current field
    if (currentField && !fieldValues[currentField.id]) {
      if (currentField.type === "signature" || currentField.type === "initial") {
        setActiveFieldId(currentField.id);
        setSignatureMode(currentField.type === "initial" ? "initial" : "signature");
        setSignatureOpen(true);
        return;
      } else if (currentField.type === "date_signed") {
        const date = new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        setFieldValues((prev) => ({ ...prev, [currentField.id]: date }));
      }
    }

    // Move to next
    if (currentNavIndex < requiredMyFields.length - 1) {
      const nextIdx = currentNavIndex + 1;
      setCurrentNavIndex(nextIdx);
      scrollToField(requiredMyFields[nextIdx].id);
    }
  }, [currentNavIndex, requiredMyFields, fieldValues, scrollToField]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Submit all field values before marking complete
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        try {
          await submitFieldValue(token, fieldId, value);
        } catch {
          // Individual field submission errors are non-fatal here;
          // the backend will validate completeness in the /complete call.
        }
      }
      return completeSigning(token, accessCode);
    },
    onSuccess: (data) => {
      if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
      setStatus("completed");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      alert(`Could not complete signing: ${message}`);
    },
  });

  const declineMutation = useMutation({
    mutationFn: (reason: string) => declineSigning(token, reason),
    onSuccess: () => {
      setDeclineOpen(false);
      setStatus("declined");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      alert(`Could not decline: ${message}`);
    },
  });

  const handleSignatureRequest = useCallback((fieldId: string, mode: "signature" | "initial") => {
    setActiveFieldId(fieldId);
    setSignatureMode(mode);
    setSignatureOpen(true);
  }, []);

  const handleAdoptSignature = useCallback((dataUrl: string) => {
    if (activeFieldId) {
      setFieldValues((prev) => ({ ...prev, [activeFieldId]: dataUrl }));

      // Auto-advance navigator
      if (hasStarted) {
        const fieldIdx = requiredMyFields.findIndex((f) => f.id === activeFieldId);
        if (fieldIdx >= 0 && fieldIdx < requiredMyFields.length - 1) {
          const nextIdx = fieldIdx + 1;
          setCurrentNavIndex(nextIdx);
          setTimeout(() => scrollToField(requiredMyFields[nextIdx].id), 300);
        }
      }
    }
    setSignatureOpen(false);
  }, [activeFieldId, hasStarted, requiredMyFields, scrollToField]);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    if (requiredMyFields.length > 0) {
      scrollToField(requiredMyFields[0].id);
      setCurrentNavIndex(0);
    }
  }, [requiredMyFields, scrollToField]);

  const senderName = envelope.from || envelope.fromEmail || "the sender";
  const recipientInfo = envelope.recipients.find((r) => r.id === recipientId);
  const recipientName = recipientInfo?.name ?? "Recipient";

  const pageCount = Math.max(1, envelope.documents?.[0]?.pageCount ?? 1);
  // First document ID used for page rendering. Multi-document support would
  // require iterating all documents; for now we follow the single-doc pattern
  // the rest of the component uses.
  const firstDocId = envelope.documents?.[0]?.id ?? null;

  // COMPLETED state
  if (status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F7" }}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #1B0A3C, #00B851)" }}
          >
            <Check size={36} weight="bold" color="white" />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#1B0A3C" }}>
            You&rsquo;re All Done!
          </h1>
          <p className="text-gray-600 mb-2 leading-relaxed">
            Your signature has been successfully applied to{" "}
            <strong>&ldquo;{envelope.subject}&rdquo;</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {senderName} will be notified and a copy will be sent to {recipientInfo?.email ?? "you"}.
          </p>

          <div className="space-y-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: "#1B0A3C" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Download Signed Document
              </a>
            )}
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border transition-colors no-underline"
              style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
            >
              Return to Home
            </a>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Powered by <span className="font-bold" style={{ color: "#1B0A3C" }}>DocuSign Clone</span>
          </p>
        </div>
      </div>
    );
  }

  // DECLINED state
  if (status === "declined") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFF5F5" }}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "#FFEBEE" }}
          >
            <PhosphorX size={36} weight="bold" color="#D93025" />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#1B0A3C" }}>
            Signing Declined
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            You have declined to sign <strong>&ldquo;{envelope.subject}&rdquo;</strong>. The sender
            has been notified.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white no-underline"
            style={{ background: "#1B0A3C" }}
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0EFF8" }}>
      {/* Top header */}
      <div
        className="flex items-center justify-between px-6 py-3 bg-white border-b flex-shrink-0 shadow-sm"
        style={{ borderColor: "#E0E0E0" }}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "#1B0A3C" }}
          >
            <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: "#1B0A3C" }}>DocuSign</span>
        </div>

        {/* Center: Document info */}
        <div className="flex-1 text-center px-4">
          <p className="text-sm font-semibold truncate max-w-sm mx-auto" style={{ color: "#1B0A3C" }}>
            {envelope.subject}
          </p>
          <p className="text-xs text-gray-400">
            From {senderName} &middot; Signing as {recipientName}
          </p>
        </div>

        {/* Right: Actions */}
        <button
          onClick={() => setDeclineOpen(true)}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1.5"
        >
          <PhosphorX size={14} weight="regular" />
          Decline
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="bg-white border-b flex-shrink-0"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="max-w-4xl mx-auto px-6 py-2.5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium">
              {completedCount} of {requiredMyFields.length} required fields completed
            </span>
            <span className="font-bold" style={{ color: isComplete ? "#00B851" : "#1B0A3C" }}>
              {requiredMyFields.length > 0 ? Math.round((completedCount / requiredMyFields.length) * 100) : (isComplete ? 100 : 0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${requiredMyFields.length > 0 ? (completedCount / requiredMyFields.length) * 100 : (isComplete ? 100 : 0)}%`,
                background: isComplete
                  ? "#00B851"
                  : "linear-gradient(90deg, #1B0A3C, #3D2A6B)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 overflow-auto py-6" ref={documentRef}>
        <div className="max-w-4xl mx-auto px-4">
          {/* Document pages */}
          {Array.from({ length: pageCount }).map((_, idx) => {
            const pageNum = idx + 1;
            const pageFields = fields.filter((f) => f.page === pageNum);

            return (
              <div key={pageNum} className="mb-6">
                {/* Page number label */}
                <div className="flex items-center gap-3 mb-2 px-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">Page {pageNum}</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div
                  className="relative bg-white shadow-lg"
                  style={{
                    width: "100%",
                    paddingTop: `${(PAGE_HEIGHT / PAGE_WIDTH) * 100}%`,
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div className="absolute inset-0">
                    {/* Real PDF page rendered server-side via the signing endpoint */}
                    {firstDocId ? (
                      <img
                        src={`/api/signing/documents/${firstDocId}/pages/${pageNum}?token=${token}`}
                        alt={`Page ${pageNum}`}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                        draggable={false}
                      />
                    ) : (
                      /* Fallback skeleton while document ID is loading */
                      <div className="p-12 space-y-3 select-none pointer-events-none absolute inset-0">
                        <div className="text-center mb-10">
                          <div className="h-4 bg-gray-200 rounded-full w-60 mx-auto mb-3" />
                          <div className="h-2 bg-gray-100 rounded-full w-40 mx-auto mb-1" />
                          <div className="h-2 bg-gray-100 rounded-full w-52 mx-auto" />
                        </div>
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="h-2 bg-gray-100 rounded-full w-full" />
                            <div className="h-2 bg-gray-100 rounded-full w-11/12" />
                            <div className="h-2 bg-gray-100 rounded-full w-4/5" />
                          </div>
                        ))}
                        <div className="mt-12 h-px bg-gray-200 w-1/3 mx-auto" />
                        <div className="h-2 bg-gray-150 rounded-full w-28 mx-auto" />
                      </div>
                    )}

                    {/* Field overlays */}
                    {pageFields.map((field) => (
                      <div
                        key={field.id}
                        ref={(el) => {
                          if (el) fieldRefs.current.set(field.id, el);
                          else fieldRefs.current.delete(field.id);
                        }}
                      >
                        <SigningField
                          field={field}
                          value={fieldValues[field.id]}
                          isCurrentField={
                            hasStarted &&
                            requiredMyFields[currentNavIndex]?.id === field.id
                          }
                          isForRecipient={field.recipientId === recipientId}
                          onSignatureRequest={handleSignatureRequest}
                          onValueChange={(fieldId, value) =>
                            setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
                          }
                          allFieldValues={fieldValues}
                          signingToken={token}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom spacer for floating navigator */}
          <div className="h-24" />
        </div>
      </div>

      {/* Field Navigator (floating) */}
      <FieldNavigator
        currentFieldIndex={currentNavIndex}
        totalFields={requiredMyFields.length}
        completedCount={completedCount}
        hasStarted={hasStarted}
        isComplete={isComplete}
        isFinishing={completeMutation.isPending}
        onStart={handleStart}
        onNext={handleNext}
        onFinish={() => completeMutation.mutate()}
      />

      {/* Signature capture dialog */}
      <SignatureCapture
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onAdopt={handleAdoptSignature}
        signerName={recipientName}
        mode={signatureMode}
      />

      {/* Decline dialog */}
      <DeclineDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onDecline={(reason) => declineMutation.mutate(reason)}
        isDeclineLoading={declineMutation.isPending}
      />
    </div>
  );
}
