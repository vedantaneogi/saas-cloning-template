"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { DocumentUpload } from "./DocumentUpload";
import { RecipientManager, type RecipientData } from "./RecipientManager";
import { createEnvelope, uploadDocument } from "../api";
import { Check } from "@phosphor-icons/react";

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  file: File;
}

const STEPS = [
  { id: 1, label: "Add Documents" },
  { id: 2, label: "Add Recipients" },
  { id: 3, label: "Message" },
];

export function CreateEnvelopeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [subject, setSubject] = useState("Please DocuSign this document");
  const [message, setMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create envelope
      const envelope = await createEnvelope({
        subject,
        message,
        recipients: recipients.map((r) => ({
          name: r.name,
          email: r.email,
          role: r.role,
          order: r.order,
        })),
      });

      // Upload documents
      for (const doc of documents) {
        await uploadDocument(envelope.id, doc.file);
      }

      return envelope;
    },
    onSuccess: (envelope) => {
      router.push(`/envelope/${envelope.id}/edit`);
    },
  });

  const canProceed = () => {
    if (step === 1) return documents.length > 0;
    if (step === 2) return recipients.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      createMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F8F8F8" }}>
      {/* Top bar */}
      <div className="bg-white border-b" style={{ borderColor: "#E0E0E0" }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold" style={{ color: "#1B0A3C" }}>
              New Envelope
            </h1>
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-0 mt-4">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step > s.id
                        ? "bg-green-500 text-white"
                        : step === s.id
                        ? "text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    style={step === s.id ? { background: "#1B0A3C" } : {}}
                  >
                    {step > s.id ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      s.id
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${step === s.id ? "text-[#1B0A3C]" : step > s.id ? "text-green-600" : "text-gray-400"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="mx-3 h-px w-12"
                    style={{ background: step > s.id ? "#00B851" : "#E0E0E0" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border p-8" style={{ borderColor: "#E0E0E0" }}>
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#1B0A3C" }}>
                Add Documents
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Upload the documents you want recipients to sign.
              </p>
              <DocumentUpload
                documents={documents}
                onAdd={(newDocs) => setDocuments((prev) => [...prev, ...newDocs])}
                onRemove={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#1B0A3C" }}>
                Add Recipients
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Add the people who need to sign or review this document.
              </p>
              <RecipientManager
                recipients={recipients}
                onAdd={(r) => setRecipients((prev) => [...prev, r])}
                onRemove={(id) => setRecipients((prev) => prev.filter((r) => r.id !== id))}
                onReorder={setRecipients}
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#1B0A3C" }}>
                Email Message
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Customize the subject and message recipients will see in their email.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#1B0A3C" }}>
                    Email Subject
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded text-sm outline-none"
                    style={{ borderColor: "#E0E0E0" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                    onBlur={(e) => (e.target.style.borderColor = "#E0E0E0")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#1B0A3C" }}>
                    Email Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Add a personal message for your recipients..."
                    className="w-full px-3 py-2.5 border rounded text-sm outline-none resize-none"
                    style={{ borderColor: "#E0E0E0" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                    onBlur={(e) => (e.target.style.borderColor = "#E0E0E0")}
                  />
                </div>

                {/* Summary */}
                <div
                  className="rounded-lg p-4"
                  style={{ background: "#F0EBFF", border: "1px solid #D9CCFF" }}
                >
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "#1B0A3C" }}>
                    Summary
                  </h3>
                  <p className="text-xs text-gray-600">
                    {documents.length} document{documents.length !== 1 ? "s" : ""} ·{" "}
                    {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-6 py-2.5 rounded text-sm font-medium border disabled:opacity-40"
            style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || createMutation.isPending}
            className="px-8 py-2.5 rounded text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: "#1B0A3C" }}
            onMouseOver={(e) => { if (canProceed()) e.currentTarget.style.background = "#2D1260"; }}
            onMouseOut={(e) => (e.currentTarget.style.background = "#1B0A3C")}
          >
            {createMutation.isPending
              ? "Creating..."
              : step < 3
              ? "Next"
              : "Prepare Document"}
          </button>
        </div>

        {createMutation.isError && (
          <div className="mt-4 p-3 rounded text-sm text-center" style={{ background: "#FFEBEE", color: "#D93025" }}>
            {(createMutation.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}
