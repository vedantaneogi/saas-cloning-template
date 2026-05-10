"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getRecipientColor } from "@/lib/utils";
import { Trash, Plus, ArrowUp, ArrowDown } from "@phosphor-icons/react";

const recipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.string().min(1, "Role is required"),
});

type RecipientFormData = z.infer<typeof recipientSchema>;

export interface RecipientData {
  id: string;
  name: string;
  email: string;
  role: string;
  order: number;
}

interface RecipientManagerProps {
  recipients: RecipientData[];
  onAdd: (recipient: RecipientData) => void;
  onRemove: (id: string) => void;
  onReorder: (recipients: RecipientData[]) => void;
}

const ROLES = [
  { value: "signer", label: "Needs to Sign" },
  { value: "approver", label: "Needs to Approve" },
  { value: "in_person", label: "In-Person Signer" },
  { value: "cc", label: "Receives a Copy" },
  { value: "viewer", label: "Needs to View" },
];

export function RecipientManager({ recipients, onAdd, onRemove, onReorder }: RecipientManagerProps) {
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RecipientFormData>({
    resolver: zodResolver(recipientSchema),
    defaultValues: { role: "signer" },
  });

  const onSubmit = handleSubmit((data) => {
    onAdd({
      id: Math.random().toString(36).slice(2),
      ...data,
      order: recipients.length + 1,
    });
    reset({ role: "signer" });
    setShowForm(false);
  });

  return (
    <div className="space-y-4">
      {/* Recipients list */}
      {recipients.map((recipient, idx) => (
        <div
          key={recipient.id}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border"
          style={{ borderColor: "#E0E0E0" }}
        >
          {/* Order badge */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: getRecipientColor(idx) }}
          >
            {recipient.order}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "#1B0A3C" }}>
              {recipient.name}
            </p>
            <p className="text-xs text-gray-500">
              {recipient.email} · {ROLES.find((r) => r.value === recipient.role)?.label ?? recipient.role}
            </p>
          </div>

          {/* Reorder buttons */}
          {recipients.length > 1 && (
            <div className="flex flex-col gap-0.5">
              <button
                disabled={idx === 0}
                onClick={() => {
                  if (idx === 0) return;
                  const arr = [...recipients];
                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                  const reordered = arr.map((r, i) => ({ ...r, order: i + 1 }));
                  onReorder(reordered);
                }}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                style={{ opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? "default" : "pointer" }}
                title="Move up"
              >
                <ArrowUp size={14} weight="bold" color="#6B6B6B" />
              </button>
              <button
                disabled={idx === recipients.length - 1}
                onClick={() => {
                  if (idx === recipients.length - 1) return;
                  const arr = [...recipients];
                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                  const reordered = arr.map((r, i) => ({ ...r, order: i + 1 }));
                  onReorder(reordered);
                }}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                style={{ opacity: idx === recipients.length - 1 ? 0.3 : 1, cursor: idx === recipients.length - 1 ? "default" : "pointer" }}
                title="Move down"
              >
                <ArrowDown size={14} weight="bold" color="#6B6B6B" />
              </button>
            </div>
          )}

          <button
            onClick={() => onRemove(recipient.id)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash size={16} weight="regular" />
          </button>
        </div>
      ))}

      {/* Add recipient form */}
      {showForm && (
        <div className="p-4 bg-white rounded-lg border" style={{ borderColor: "#1B0A3C" }}>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#1B0A3C" }}>
                  Full Name *
                </label>
                <input
                  {...register("name")}
                  placeholder="Recipient name"
                  className="w-full px-3 py-2 border rounded text-sm outline-none"
                  style={{ borderColor: errors.name ? "#D93025" : "#E0E0E0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) => (e.target.style.borderColor = errors.name ? "#D93025" : "#E0E0E0")}
                />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#1B0A3C" }}>
                  Email Address *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="recipient@email.com"
                  className="w-full px-3 py-2 border rounded text-sm outline-none"
                  style={{ borderColor: errors.email ? "#D93025" : "#E0E0E0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
                  onBlur={(e) => (e.target.style.borderColor = errors.email ? "#D93025" : "#E0E0E0")}
                />
                {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#1B0A3C" }}>
                Action
              </label>
              <select
                {...register("role")}
                className="w-full px-3 py-2 border rounded text-sm outline-none bg-white appearance-none"
                style={{ borderColor: "#E0E0E0" }}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { reset(); setShowForm(false); }}
                className="px-4 py-2 rounded text-sm border"
                style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded text-sm font-semibold text-white"
                style={{ background: "#1B0A3C" }}
              >
                Add Recipient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 py-3 px-4 border-2 border-dashed rounded-lg text-sm font-medium transition-colors"
          style={{ borderColor: "#E0E0E0", color: "#1B0A3C" }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = "#1B0A3C")}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = "#E0E0E0")}
        >
          <Plus size={16} weight="regular" />
          Add Recipient
        </button>
      )}
    </div>
  );
}
