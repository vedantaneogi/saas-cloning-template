"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { Contact } from "../api";

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; company?: string; phone?: string }) => void;
  isSaving?: boolean;
  contact?: Contact | null;
  error?: string | null;
}

export function ContactDialog({
  open,
  onClose,
  onSave,
  isSaving = false,
  contact = null,
  error = null,
}: ContactDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
  }>({});

  // Sync contact data when editing
  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setEmail(contact.email);
      setCompany(contact.company ?? "");
      setPhone(contact.phone ?? "");
    } else {
      setName("");
      setEmail("");
      setCompany("");
      setPhone("");
    }
    setValidationErrors({});
  }, [contact, open]);

  const validate = (): boolean => {
    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Name is required";
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      email: email.trim(),
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  const isEditing = !!contact;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Contact" : "Add Contact"}
      size="md"
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationErrors.name) {
                setValidationErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Jane Smith"
            className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
            style={{
              borderColor: validationErrors.name ? "#D93025" : "rgba(19, 0, 50, 0.1)",
              color: "rgba(19, 0, 50, 0.9)",
              fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = validationErrors.name ? "#D93025" : "#260559")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = validationErrors.name ? "#D93025" : "rgba(19, 0, 50, 0.1)")
            }
          />
          {validationErrors.name && (
            <p className="text-xs mt-1" style={{ color: "#D93025" }}>
              {validationErrors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErrors.email) {
                setValidationErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="jane@example.com"
            className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
            style={{
              borderColor: validationErrors.email ? "#D93025" : "rgba(19, 0, 50, 0.1)",
              color: "rgba(19, 0, 50, 0.9)",
              fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = validationErrors.email ? "#D93025" : "#260559")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = validationErrors.email ? "#D93025" : "rgba(19, 0, 50, 0.1)")
            }
          />
          {validationErrors.email && (
            <p className="text-xs mt-1" style={{ color: "#D93025" }}>
              {validationErrors.email}
            </p>
          )}
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
            Company
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Acme Corp"
            className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
            style={{
              borderColor: "rgba(19, 0, 50, 0.1)",
              color: "rgba(19, 0, 50, 0.9)",
              fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#260559")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(19, 0, 50, 0.1)")}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-2.5 border rounded text-sm outline-none transition-colors"
            style={{
              borderColor: "rgba(19, 0, 50, 0.1)",
              color: "rgba(19, 0, 50, 0.9)",
              fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#260559")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(19, 0, 50, 0.1)")}
          />
        </div>

        {/* Server error */}
        {error && (
          <div
            className="rounded px-3 py-2.5 text-sm"
            style={{ background: "#FFEBEE", color: "#D93025" }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={handleSubmit}
          >
            {isEditing ? "Save Changes" : "Add Contact"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
