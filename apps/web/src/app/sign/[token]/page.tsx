"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Warning } from "@phosphor-icons/react";
import { getSigningSession, verifySigningAccessCode } from "@/features/signing/api";
import { AccessCodeGate } from "@/features/signing/components/AccessCodeGate";
import { ConsentGate } from "@/features/signing/components/ConsentGate";
import { SigningCeremony } from "@/features/signing/components/SigningCeremony";

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [accessCodeVerified, setAccessCodeVerified] = useState(false);
  const [verifiedAccessCode, setVerifiedAccessCode] = useState<string | undefined>(undefined);
  const [hasConsented, setHasConsented] = useState(false);
  const [declinedConsent, setDeclinedConsent] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["signing-session", token],
    queryFn: () => getSigningSession(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1B0A3C, #2D0A7A)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full animate-spin"
            style={{ border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#ffffff" }}
          />
          <div className="text-center">
            <p className="text-white font-semibold mb-1">Loading your document...</p>
            <p className="text-white/40 text-sm">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #1B0A3C, #2D0A7A)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "#FFEBEE" }}
          >
            <Warning size={28} color="#D93025" weight="fill" />
          </div>
          <h1 className="text-xl font-bold mb-3" style={{ color: "#1B0A3C" }}>
            Signing Link Not Valid
          </h1>
          <p className="text-gray-600 mb-3 leading-relaxed">
            This signing link has expired, already been used, or is not valid.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Please contact the sender to request a new signing link.
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white no-underline"
            style={{ background: "#1B0A3C" }}
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  if (declinedConsent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #1B0A3C, #2D0A7A)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "#FFF3E0" }}
          >
            <Warning size={28} color="#F57C00" weight="fill" />
          </div>
          <h1 className="text-xl font-bold mb-3" style={{ color: "#1B0A3C" }}>
            Electronic Consent Declined
          </h1>
          <p className="text-gray-600 mb-3 leading-relaxed">
            You have chosen not to receive electronic records. No signature has been applied.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Please contact the sender to arrange an alternative signing method.
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white no-underline"
            style={{ background: "#1B0A3C" }}
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Access code gate (before consent)
  if (data.requiresAccessCode && !accessCodeVerified) {
    return (
      <AccessCodeGate
        documentName={data.envelope.subject}
        senderName={data.envelope.from || data.envelope.fromEmail || "Sender"}
        onVerified={() => setAccessCodeVerified(true)}
        onVerify={async (code) => {
          await verifySigningAccessCode(token, code);
          // Store the verified code so we can pass it to completeSigning for
          // backend-level enforcement (prevents API bypass without the code).
          setVerifiedAccessCode(code);
        }}
      />
    );
  }

  // Self-sign detection: signer email matches sender email
  const signerEmail = data.recipientEmail || data.envelope.recipients?.find((r: { id: string; email?: string }) => r.id === data.recipientId)?.email;
  const senderEmail = data.envelope.fromEmail;
  const isSelfSign = !!(signerEmail && senderEmail && signerEmail.toLowerCase() === senderEmail.toLowerCase());

  if (!hasConsented && !isSelfSign) {
    return (
      <ConsentGate
        senderName={data.envelope.from || data.envelope.fromEmail || "Sender"}
        documentName={data.envelope.subject}
        recipientName={data.recipientName}
        onConsent={() => setHasConsented(true)}
        onDecline={() => setDeclinedConsent(true)}
      />
    );
  }

  return (
    <SigningCeremony
      token={token}
      envelope={data.envelope}
      recipientId={data.recipientId}
      fields={data.fields ?? []}
      accessCode={verifiedAccessCode}
      isSelfSign={isSelfSign}
    />
  );
}
