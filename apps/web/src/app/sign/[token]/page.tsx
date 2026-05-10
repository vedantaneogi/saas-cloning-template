"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Warning, ShieldCheck, IdentificationCard, Globe, BookOpen } from "@phosphor-icons/react";
import { getSigningSession, verifySigningAccessCode } from "@/features/signing/api";
import { AccessCodeGate } from "@/features/signing/components/AccessCodeGate";
import { SigningCeremony } from "@/features/signing/components/SigningCeremony";

function GateWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0" style={{ background: "#F5F5F5", filter: "blur(6px)", pointerEvents: "none" }}>
        <div style={{ height: 64, background: "#1B0A3C" }} />
        <div className="flex justify-center pt-8 px-4"><div style={{ width: 700, height: 900, background: "white", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} /></div>
      </div>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
      <div className="relative z-10 min-h-screen flex items-center justify-center">{children}</div>
    </div>
  );
}

function IdVerificationGate({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<"intro" | "agree" | "select" | "upload" | "verifying" | "done">("intro");
  const [idType, setIdType] = useState("");

  useEffect(() => {
    if (step !== "verifying") return;
    const t = setTimeout(() => setStep("done"), 2000);
    return () => clearTimeout(t);
  }, [step]);

  if (step === "done") {
    return (
      <GateWrapper>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1B0A3C", marginBottom: "24px" }}>Your ID Has Been Verified</h2>
          <div className="mx-auto mb-6" style={{ width: 120, height: 80, background: "#F0FDF4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <IdentificationCard size={48} weight="bold" color="#86EFAC" />
            <div style={{ position: "absolute", bottom: -4, right: -4, background: "#F59E0B", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={14} weight="bold" color="white" />
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>Go back to your computer to finish.</p>
          <button onClick={onVerified} className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#00B851", border: "none", cursor: "pointer" }}>
            Continue to Document
          </button>
        </div>
      </GateWrapper>
    );
  }

  if (step === "verifying") {
    return (
      <GateWrapper>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1B0A3C", marginBottom: "24px" }}>Verifying Your ID...</h2>
          <div className="animate-spin mx-auto mb-6" style={{ width: 48, height: 48, border: "4px solid #E5E7EB", borderTopColor: "#4C00FF", borderRadius: "50%" }} />
          <p style={{ fontSize: "14px", color: "#6B7280" }}>This should only take a moment.</p>
        </div>
      </GateWrapper>
    );
  }

  if (step === "upload") {
    return (
      <GateWrapper>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1B0A3C", marginBottom: "8px" }}>Upload Your {idType || "ID"}</h2>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px" }}>Take a photo or upload an image of your ID document.</p>
          <div
            className="border-2 border-dashed rounded-xl p-8 mb-6 cursor-pointer hover:bg-purple-50 transition-colors"
            style={{ borderColor: "#D1D5DB" }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".png,.jpg,.jpeg,.pdf,.doc,.docx";
              input.onchange = () => { if (input.files?.[0]) setStep("verifying"); };
              input.click();
            }}
          >
            <IdentificationCard size={40} weight="bold" color="#9CA3AF" className="mx-auto mb-3" />
            <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Click to upload photo or document</p>
            <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "4px 0 0" }}>PNG, JPG, PDF, DOC accepted</p>
          </div>
          <button onClick={() => setStep("select")} style={{ fontSize: "13px", color: "#6B7280", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>← BACK</button>
        </div>
      </GateWrapper>
    );
  }

  if (step === "select") {
    return (
      <GateWrapper>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1B0A3C", marginBottom: "16px" }}>Tell Us About Your ID</h2>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "8px" }}>Issued in</p>
          <select style={{ width: "100%", border: "1px solid #D1D5DB", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#1B0A3C", marginBottom: "20px", outline: "none" }}>
            <option>United States</option><option>India</option><option>United Kingdom</option><option>Canada</option><option>Australia</option>
          </select>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "12px" }}>ID type</p>
          <div className="space-y-2 mb-6 text-left">
            {[
              { id: "passport", icon: <BookOpen size={20} weight="bold" color="#1B0A3C" />, label: "Passport", sub: "" },
              { id: "photo_id", icon: <IdentificationCard size={20} weight="bold" color="#1B0A3C" />, label: "Photo ID", sub: "Identification card, Driver license, Passport card" },
              { id: "kba", icon: <ShieldCheck size={20} weight="bold" color="#1B0A3C" />, label: "Knowledge-Based Authentication (KBA)", sub: "" },
            ].map((t) => (
              <button key={t.id} onClick={() => { setIdType(t.label); setStep("upload"); }} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors" style={{ border: "1px solid #E5E7EB", background: "white", cursor: "pointer", textAlign: "left" }}>
                {t.icon}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1B0A3C" }}>{t.label}</div>
                  {t.sub && <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{t.sub}</div>}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("agree")} style={{ fontSize: "13px", color: "#6B7280", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>← BACK</button>
        </div>
      </GateWrapper>
    );
  }

  if (step === "agree") {
    return (
      <GateWrapper>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1B0A3C", marginBottom: "16px" }}>Let&rsquo;s Verify Your Identity</h2>
          <div className="mx-auto mb-6" style={{ width: 80, height: 80, background: "#FEF3C7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Globe size={40} weight="bold" color="#92A3B8" />
            <div style={{ position: "absolute", bottom: -2, right: -2, background: "#F59E0B", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={12} weight="bold" color="white" />
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.6, marginBottom: "12px" }}>First, you need to agree that we can process some of your personal information to verify your identity.</p>
          <a href="#" style={{ fontSize: "13px", color: "#4C00FF", marginBottom: "20px", display: "block" }}>How we process your information</a>
          <button onClick={() => setStep("select")} className="w-full py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#3B5BDB", border: "none", cursor: "pointer" }}>
            I AGREE
          </button>
        </div>
      </GateWrapper>
    );
  }

  // intro
  return (
    <GateWrapper>
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full mx-4 text-center">
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1B0A3C", marginBottom: "16px" }}>Let&rsquo;s Verify Your Identity</h2>
        <div className="mx-auto mb-6" style={{ width: 80, height: 80, background: "#FEF3C7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Globe size={40} weight="bold" color="#92A3B8" />
          <div style={{ position: "absolute", bottom: -2, right: -2, background: "#F59E0B", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={12} weight="bold" color="white" />
          </div>
        </div>
        <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.6, marginBottom: "8px" }}>The sender is requesting a form of ID to verify your identity. It should only take a few minutes.</p>
        <p style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.5, marginBottom: "24px" }}>By clicking START, you agree to the processing of identification information you provide.</p>
        <button onClick={() => setStep("agree")} className="w-full py-3 rounded-lg text-sm font-bold" style={{ background: "#F59E0B", color: "#1B0A3C", border: "none", cursor: "pointer" }}>
          START
        </button>
      </div>
    </GateWrapper>
  );
}

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [accessCodeVerified, setAccessCodeVerified] = useState(false);
  const [verifiedAccessCode, setVerifiedAccessCode] = useState<string | undefined>(undefined);
  const [idVerified, setIdVerified] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["signing-session", token],
    queryFn: () => getSigningSession(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F5F5F5" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{ border: "3px solid #E0E0E0", borderTopColor: "#1B0A3C" }}
          />
          <div className="text-center">
            <p className="font-semibold mb-1" style={{ color: "#1B0A3C" }}>Loading your document...</p>
            <p className="text-gray-400 text-sm">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "#F5F5F5" }}
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

  // ID verification gate (checked first — takes priority over access code)
  if (data.requiresIdCheck && !idVerified) {
    return <IdVerificationGate onVerified={() => setIdVerified(true)} />;
  }

  // Access code gate
  if (data.requiresAccessCode && !accessCodeVerified) {
    return (
      <AccessCodeGate
        documentName={data.envelope.subject}
        senderName={data.envelope.from || data.envelope.fromEmail || "Sender"}
        onVerified={() => setAccessCodeVerified(true)}
        onVerify={async (code) => {
          await verifySigningAccessCode(token, code);
          setVerifiedAccessCode(code);
        }}
      />
    );
  }

  const signerEmail =
    data.recipientEmail ||
    data.envelope.recipients?.find((r: { id: string; email?: string }) => r.id === data.recipientId)?.email ||
    data.envelope.fromEmail;
  const isActuallySelfSign = !!(signerEmail && data.envelope.fromEmail && signerEmail.toLowerCase() === data.envelope.fromEmail.toLowerCase());

  return (
    <SigningCeremony
      token={token}
      envelope={data.envelope}
      recipientId={data.recipientId}
      fields={data.fields ?? []}
      accessCode={verifiedAccessCode}
      isSelfSign={isActuallySelfSign}
      isActuallySelfSign={isActuallySelfSign}
    />
  );
}
