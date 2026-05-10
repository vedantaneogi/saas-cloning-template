"use client";

import { useEffect, useState } from "react";
import type { PlacedField } from "@/features/editor/model/types";
import { cn } from "@/lib/utils";
import { Check } from "@phosphor-icons/react";

interface SigningFieldProps {
  field: PlacedField;
  value: string | undefined;
  isCurrentField: boolean;
  isForRecipient: boolean;
  onSignatureRequest: (fieldId: string, mode: "signature" | "initial") => void;
  onValueChange: (fieldId: string, value: string) => void;
  /** All field values keyed by field id — needed for conditional visibility */
  allFieldValues?: Record<string, string>;
  /** All field metadata — used to build label→value maps for formula evaluation */
  allFields?: PlacedField[];
  /** Signing token — used for attachment uploads */
  signingToken?: string;
  /** When true, parent handles positioning — field renders at relative position */
  inlinePositioned?: boolean;
}

export function SigningField({
  field,
  value,
  isCurrentField,
  isForRecipient,
  onSignatureRequest,
  onValueChange,
  allFieldValues = {},
  allFields = [],
  signingToken,
  inlinePositioned,
}: SigningFieldProps) {
  const isCompleted = !!value;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [expMM, setExpMM] = useState("");
  const [expYY, setExpYY] = useState("");
  const [cvv, setCvv] = useState("");

  const posStyle: React.CSSProperties = inlinePositioned
    ? { width: "100%", height: "100%" }
    : { left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%` };
  const posClass = inlinePositioned ? "relative" : "absolute";

  // Feature: Conditional Fields — evaluate show/hide based on parent field value
  if (field.conditionalOn) {
    const parentValue = allFieldValues[field.conditionalOn] ?? "";
    const expectedValue = field.conditionalValue ?? "checked";
    const action = field.conditionalAction ?? "show";
    let conditionMet: boolean;
    if (expectedValue === "checked") {
      conditionMet = parentValue === "checked" || parentValue === "true";
    } else if (expectedValue === "not_checked") {
      conditionMet = parentValue === "" || parentValue === "false" || !parentValue;
    } else if (expectedValue === "any") {
      conditionMet = !!parentValue && parentValue !== "" && parentValue !== "false";
    } else {
      conditionMet = parentValue === expectedValue;
    }

    if (action === "show" && !conditionMet) return null;
    if (action === "hide" && conditionMet) return null;
  }

  // Fields not for this recipient are greyed out and non-interactive
  if (!isForRecipient) {
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded select-none pointer-events-none`}
        style={{
          ...posStyle,
          background: "rgba(0,0,0,0.04)",
          border: "1.5px solid rgba(0,0,0,0.12)",
          zIndex: 5,
        }}
      >
        <span className="text-xs text-gray-300 font-medium">
          {field.type === "signature" ? "Signature" : field.type}
        </span>
      </div>
    );
  }

  const getBorderColor = () => {
    if (isCompleted) return "#00B851";
    if (isCurrentField) return "#F59E0B";
    return "#1B0A3C";
  };

  const getBgColor = () => {
    if (isCompleted) return "rgba(0,184,81,0.08)";
    if (isCurrentField) return "rgba(245,158,11,0.15)";
    return "rgba(76,0,255,0.06)";
  };

  const borderColor = getBorderColor();
  const bgColor = getBgColor();

  const handleClick = () => {
    if (isCompleted && field.type !== "checkbox") return;
    if (field.type === "signature") {
      onSignatureRequest(field.id, "signature");
    } else if (field.type === "initial") {
      onSignatureRequest(field.id, "initial");
    } else if (field.type === "date_signed") {
      const date = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      onValueChange(field.id, date);
    } else if (field.type === "checkbox") {
      onValueChange(field.id, value === "checked" ? "" : "checked");
    }
  };

  // SIGNATURE / INITIAL fields
  if (field.type === "signature" || field.type === "initial") {
    return (
      <div
        className={cn(
          `${posClass} flex items-center justify-center rounded cursor-pointer transition-all group select-none`,
          isForRecipient && !isCompleted && "animate-pulse",
        )}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: isCurrentField ? 15 : (isForRecipient && !isCompleted ? 12 : 10),
          animationDuration: isCurrentField ? "1s" : "2.5s",
        }}
        onClick={handleClick}
      >
        {isCompleted ? (
          // Show signature image or text
          value?.startsWith("data:") ? (
            <img
              src={value}
              alt="Signature"
              className="w-full h-full pointer-events-none"
              style={{ objectFit: "contain", padding: "2px 4px" }}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full p-1">
              <span
                style={{
                  fontFamily: "cursive",
                  fontSize: "clamp(12px, 2vw, 22px)",
                  color: "#1B0A3C",
                  lineHeight: 1.2,
                }}
              >
                {value?.split(":")?.[1] ?? value}
              </span>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: isCurrentField ? "#F59E0B" : "#1B0A3C",
                color: isCurrentField ? "#1B0A3C" : "white",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              {field.type === "initial" ? "Initial" : "Sign"}
            </div>
          </div>
        )}

        {/* Completed checkmark badge */}
        {isCompleted && (
          <div
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#00B851" }}
          >
            <Check size={12} weight="bold" color="white" />
          </div>
        )}
      </div>
    );
  }

  // DATE_SIGNED field
  if (field.type === "date_signed") {
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all`}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={handleClick}
      >
        {value ? (
          <span className="text-xs font-medium px-1 truncate" style={{ color: "#1B0A3C" }}>
            {value}
          </span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: borderColor }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="inline mr-1">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
            </svg>
            Date
          </span>
        )}
      </div>
    );
  }

  // CHECKBOX field
  if (field.type === "checkbox") {
    const isChecked = value === "checked";
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all`}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={handleClick}
      >
        <div
          className="w-4 h-4 rounded border-2 flex items-center justify-center"
          style={{
            borderColor: isChecked ? "#00B851" : borderColor,
            background: isChecked ? "#00B851" : "white",
          }}
        >
          {isChecked && (
            <Check size={10} weight="bold" color="white" />
          )}
        </div>
      </div>
    );
  }

  // TEXT, NAME, EMAIL, COMPANY, TITLE, NUMBER fields — inline input
  if (["text", "name", "email", "company", "title", "number"].includes(field.type)) {
    return (
      <div
        className={posClass}
        style={{
          ...posStyle,
          zIndex: isCurrentField ? 15 : 10,
        }}
      >
        <input
          type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
          value={value || ""}
          onChange={(e) => onValueChange(field.id, e.target.value)}
          placeholder={
            field.type === "name" ? "Full Name" :
              field.type === "email" ? "Email Address" :
                field.type === "company" ? "Company Name" :
                  field.type === "title" ? "Title" :
                    field.type === "number" ? "0" :
                      field.label || "Enter text"
          }
          className="w-full h-full px-2 text-xs outline-none rounded"
          style={{
            background: bgColor,
            border: `2px solid ${borderColor}`,
            color: "#1B0A3C",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#1B0A3C";
            e.target.style.boxShadow = "0 0 0 3px rgba(76,0,255,0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = borderColor;
            e.target.style.boxShadow = "none";
          }}
        />
      </div>
    );
  }

  // DROPDOWN field
  if (field.type === "dropdown") {
    return (
      <div
        className={posClass}
        style={{
          ...posStyle,
          zIndex: isCurrentField ? 15 : 10,
        }}
      >
        <select
          value={value || ""}
          onChange={(e) => onValueChange(field.id, e.target.value)}
          className="w-full h-full px-2 text-xs outline-none rounded bg-white appearance-none"
          style={{
            border: `2px solid ${borderColor}`,
            background: bgColor,
            color: value ? "#1B0A3C" : "#9E9E9E",
          }}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  // RADIO field
  if (field.type === "radio") {
    const isSelected = value === "selected";
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer`}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={() => onValueChange(field.id, isSelected ? "" : "selected")}
      >
        <div
          className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: isSelected ? "#1B0A3C" : borderColor,
          }}
        >
          {isSelected && (
            <div className="w-2 h-2 rounded-full" style={{ background: "#1B0A3C" }} />
          )}
        </div>
      </div>
    );
  }

  // FORMULA field — read-only, auto-calculated from labeled fields
  if (field.type === "formula") {
    const formulaStr = field.formula ?? "";
    const dp = field.decimalPlaces ?? 2;
    let displayValue = "—";
    if (formulaStr) {
      try {
        // Build a label→value map from allFields + allFieldValues (id→value)
        const labelValueMap: Record<string, string> = {};
        for (const f of allFields) {
          if (f.label && allFieldValues[f.id] !== undefined) {
            labelValueMap[f.label] = allFieldValues[f.id];
          }
        }
        // Helper: parse date string
        const parseDate = (s: string): Date | null => {
          if (!s) return null;
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d;
          const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
          return null;
        };
        const resolveRef = (arg: string): string => {
          const t = arg.trim();
          if (t.startsWith("[") && t.endsWith("]")) return labelValueMap[t.slice(1, -1)] ?? "";
          return t.replace(/^["']|["']$/g, "");
        };

        let substituted = formulaStr;
        // Date functions — process BEFORE numeric substitution (need raw date strings)
        substituted = substituted.replace(/Today\s*\(\s*\)/gi, () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
        substituted = substituted.replace(/Now\s*\(\s*\)/gi, () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`; });
        const dateArg = /(\[[^\]]+\]|"[^"]*"|'[^']*'|[\d][\d.:\-]+[\d]|[\d.+-]+)/;
        substituted = substituted.replace(new RegExp(`AddDays\\s*\\(\\s*${dateArg.source}\\s*,\\s*${dateArg.source}\\s*\\)`, "gi"), (_, d, n) => {
          const dt = parseDate(resolveRef(d)); const days = parseFloat(resolveRef(n));
          if (!dt || isNaN(days)) return "0";
          dt.setDate(dt.getDate() + days);
          return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
        });
        substituted = substituted.replace(new RegExp(`AddMonths\\s*\\(\\s*${dateArg.source}\\s*,\\s*${dateArg.source}\\s*\\)`, "gi"), (_, d, n) => {
          const dt = parseDate(resolveRef(d)); const months = parseInt(resolveRef(n));
          if (!dt || isNaN(months)) return "0";
          dt.setMonth(dt.getMonth() + months);
          return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
        });
        substituted = substituted.replace(new RegExp(`AddYears\\s*\\(\\s*${dateArg.source}\\s*,\\s*${dateArg.source}\\s*\\)`, "gi"), (_, d, n) => {
          const dt = parseDate(resolveRef(d)); const years = parseInt(resolveRef(n));
          if (!dt || isNaN(years)) return "0";
          dt.setFullYear(dt.getFullYear() + years);
          return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
        });
        substituted = substituted.replace(new RegExp(`DateDiff\\s*\\(\\s*${dateArg.source}\\s*,\\s*${dateArg.source}\\s*\\)`, "gi"), (_, d1, d2) => {
          const a = parseDate(resolveRef(d1)); const b = parseDate(resolveRef(d2));
          if (!a || !b) return "0";
          return String(Math.round((a.getTime() - b.getTime()) / 86400000));
        });
        substituted = substituted.replace(new RegExp(`Days\\s*\\(\\s*${dateArg.source}\\s*\\)`, "gi"), (_, d) => {
          const dt = parseDate(resolveRef(d));
          if (!dt) return "0";
          return String(new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate());
        });
        substituted = substituted.replace(new RegExp(`Day\\s*\\(\\s*${dateArg.source}\\s*\\)`, "gi"), (_, d) => {
          const dt = parseDate(resolveRef(d));
          return dt ? String(dt.getDate()) : "0";
        });

        // Check if result is a date/datetime string — show directly
        if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(substituted.trim())) {
          const dateStr = substituted.trim().slice(0, 10);
          const rd = new Date(dateStr + "T00:00:00");
          displayValue = rd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        } else {
          // Replace remaining [Label] refs with numeric values
          substituted = substituted.replace(/\[([^\]]+)\]/g, (_match, label: string) => {
            const val = labelValueMap[label];
            if (val !== undefined) { const n = parseFloat(val); return isNaN(n) ? "0" : String(n); }
            return "0";
          });
          // Math functions
          substituted = substituted.replace(/Floor\s*\(\s*([\d.+-]+)\s*\)/gi, (_, v) => String(Math.floor(parseFloat(v) || 0)));
          substituted = substituted.replace(/Round\s*\(\s*([\d.+-]+)\s*,\s*([\d]+)\s*\)/gi, (_, v, p) => String(parseFloat((parseFloat(v) || 0).toFixed(parseInt(p) || 0))));
          substituted = substituted.replace(/Abs\s*\(\s*([\d.+-]+)\s*\)/gi, (_, v) => String(Math.abs(parseFloat(v) || 0)));
          substituted = substituted.replace(/min\s*\(\s*([\d.,\s+-]+)\s*\)/gi, (_, args) => { const nums = args.split(",").map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n)); return nums.length ? String(Math.min(...nums)) : "0"; });
          substituted = substituted.replace(/max\s*\(\s*([\d.,\s+-]+)\s*\)/gi, (_, args) => { const nums = args.split(",").map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n)); return nums.length ? String(Math.max(...nums)) : "0"; });
          substituted = substituted.replace(/sum\s*\(\s*([\d.,\s+-]+)\s*\)/gi, (_, args) => { const nums = args.split(",").map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n)); return String(nums.reduce((a: number, b: number) => a + b, 0)); });
          substituted = substituted.replace(/average\s*\(\s*([\d.,\s+-]+)\s*\)/gi, (_, args) => { const nums = args.split(",").map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n)); return nums.length ? String(nums.reduce((a: number, b: number) => a + b, 0) / nums.length) : "0"; });
          substituted = substituted.replace(/if\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, (_, cond, t, f) => {
            const c = cond.trim();
            for (const [op, fn] of [[">=", (a: number, b: number) => a >= b], ["<=", (a: number, b: number) => a <= b], ["!=", (a: number, b: number) => a !== b], ["==", (a: number, b: number) => a === b], [">", (a: number, b: number) => a > b], ["<", (a: number, b: number) => a < b]] as [string, (a: number, b: number) => boolean][]) {
              if (c.includes(op)) { const parts = c.split(op); return (fn(parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0) ? t : f).trim(); }
            }
            return (parseFloat(c) !== 0 ? t : f).trim();
          });
          if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(substituted.trim())) {
            const rd = new Date(substituted.trim().slice(0, 10) + "T00:00:00");
            displayValue = rd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          } else if (/^[\d\s+\-*/().]+$/.test(substituted.trim())) {
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict"; return (' + substituted + ')')() as number;
            displayValue = isNaN(result) || !isFinite(result) ? "Error" : result.toFixed(dp);
          }
        }
      } catch {
        displayValue = "Error";
      }
    }
    // Show backend-computed value if available (after signing completion)
    const shownValue = value || displayValue;
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded`}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
      >
        <span className="text-xs font-medium px-1 truncate" style={{ color: "#1B0A3C" }}>
          ƒ {shownValue}
        </span>
      </div>
    );
  }

  // ATTACHMENT field — click to upload a file
  if (field.type === "attachment") {
    const hasFile = !!value && value !== "";
    // Show only the filename portion so long stored paths don't overflow the field widget
    const displayName = value ? (value.split("/").pop() ?? value) : "";
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all`}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px dashed ${hasFile ? "#00B851" : borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={() => {
          if (hasFile) return;
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt,image/png,image/jpeg,image/gif";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const MAX_SIZE = 5 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
              alert("File must be under 5MB.");
              return;
            }
            if (signingToken) {
              try {
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = (reader.result as string).split(",")[1] ?? "";
                  const res = await fetch(`/api/signing/${signingToken}/attachment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ field_id: field.id, filename: file.name, data: base64 }),
                  });
                  if (res.ok) {
                    // Use the stored_path returned by the server so the field value
                    // written on complete matches the actual file location on disk.
                    const json = await res.json() as { stored_path?: string; filename?: string };
                    onValueChange(field.id, json.stored_path ?? json.filename ?? file.name);
                  } else {
                    const errJson = await res.json().catch(() => ({})) as { detail?: string };
                    alert(`Attachment upload failed: ${errJson.detail ?? "Please try again."}`);
                  }
                };
                reader.readAsDataURL(file);
              } catch {
                alert("Attachment upload failed. Please try again.");
              }
            } else {
              // No signing token (preview/offline mode) — mark locally with filename
              onValueChange(field.id, file.name);
            }
          };
          input.click();
        }}
      >
        {hasFile ? (
          <div className="flex items-center gap-1 px-1">
            <Check size={10} weight="bold" color="#00B851" />
            <span className="text-xs truncate" style={{ color: "#00B851", maxWidth: "90%" }}>
              {displayName}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <svg viewBox="0 0 24 24" fill={borderColor} width="14" height="14">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: borderColor, fontSize: "9px" }}>
              {field.label || "Click to upload"}
            </span>
          </div>
        )}
        {hasFile && (
          <div
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#00B851" }}
          >
            <Check size={12} weight="bold" color="white" />
          </div>
        )}
      </div>
    );
  }

  // PAYMENT field — shows amount, click opens payment modal
  if (field.type === "payment") {
    const currency = field.paymentCurrency ?? "USD";
    const amountDollars = field.paymentAmount != null
      ? (field.paymentAmount / 100).toFixed(2)
      : "0.00";
    const isPaid = !!value;
    const payFormFilled = cardNum.length > 0 && expMM.length > 0 && expYY.length > 0 && cvv.length > 0;

    return (
      <>
        <div
          className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all`}
          style={{
            ...posStyle,
            background: isPaid ? "rgba(0,184,81,0.08)" : bgColor,
            border: `2px solid ${isPaid ? "#00B851" : borderColor}`,
            zIndex: isCurrentField ? 15 : 10,
          }}
          onClick={() => { if (!isPaid) setShowPaymentModal(true); }}
        >
          <span style={{ fontSize: "clamp(10px, 1.2vw, 14px)", fontWeight: 600, color: isPaid ? "#00B851" : "#1B0A3C" }}>
            ${amountDollars} {currency}
          </span>
          {isPaid && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#00B851" }}>
              <Check size={12} weight="bold" color="white" />
            </div>
          )}
        </div>

        {/* Payment modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh]" style={{ fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif" }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPaymentModal(false)} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1B0A3C", margin: 0 }}>Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px" }}>&times;</button>
              </div>
              <div className="px-5 py-4">
                <div className="flex justify-between mb-4">
                  <span style={{ fontSize: "14px", color: "#6B7280" }}>Pay Now</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1B0A3C" }}>Total ${amountDollars} {currency}</span>
                </div>

                <div style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "8px" }}>Payment Method</div>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded" style={{ border: "2px solid #1B0A3C", background: "white" }}>
                    <svg viewBox="0 0 24 24" fill="#1B0A3C" width="20" height="20"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#1B0A3C" }}>CREDIT / DEBIT</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1 py-3 rounded" style={{ border: "1px solid #E5E7EB", background: "white", opacity: 0.5 }}>
                    <svg viewBox="0 0 24 24" fill="#9CA3AF" width="20" height="20"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" /></svg>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF" }}>ACH TRANSFER</span>
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Debit/Credit Card <span style={{ color: "#EF4444" }}>*</span></div>
                <input type="text" inputMode="numeric" placeholder="XXXX XXXX XXXX XXXX" value={cardNum} onChange={(e) => setCardNum(e.target.value.replace(/[^0-9 ]/g, ""))} style={{ width: "100%", border: `1px solid ${cardNum ? "#1B0A3C" : "#E5E7EB"}`, borderRadius: "6px", padding: "10px 12px", fontSize: "14px", color: "#1B0A3C", marginBottom: "12px", background: "white", outline: "none" }} />

                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Expiration Date <span style={{ color: "#EF4444" }}>*</span></div>
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" placeholder="MM" maxLength={2} value={expMM} onChange={(e) => setExpMM(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "50%", border: `1px solid ${expMM ? "#1B0A3C" : "#E5E7EB"}`, borderRadius: "6px", padding: "10px 8px", fontSize: "14px", color: "#1B0A3C", background: "white", outline: "none" }} />
                      <input type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} value={expYY} onChange={(e) => setExpYY(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "50%", border: `1px solid ${expYY ? "#1B0A3C" : "#E5E7EB"}`, borderRadius: "6px", padding: "10px 8px", fontSize: "14px", color: "#1B0A3C", background: "white", outline: "none" }} />
                    </div>
                  </div>
                  <div style={{ width: "40%" }}>
                    <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Security Code <span style={{ color: "#EF4444" }}>*</span></div>
                    <input type="text" inputMode="numeric" placeholder="CVV" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", border: `1px solid ${cvv ? "#1B0A3C" : "#E5E7EB"}`, borderRadius: "6px", padding: "10px 8px", fontSize: "14px", color: "#1B0A3C", background: "white", outline: "none" }} />
                  </div>
                </div>

                <p style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: 1.4, marginBottom: "12px" }}>
                  Payment processing is not configured for this envelope. Click below to acknowledge the payment obligation.
                </p>

                <button
                  disabled={!payFormFilled}
                  className="w-full py-3 rounded text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: "#00B851", border: "none", cursor: payFormFilled ? "pointer" : "not-allowed" }}
                  onClick={() => {
                    onValueChange(field.id, `Payment completed - $${amountDollars}`);
                    setShowPaymentModal(false);
                  }}
                >
                  PAY & FINISH
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // APPROVE field — one-click approval button
  if (field.type === "approve") {
    const isApproved = !!value;
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all select-none`}
        style={{
          ...posStyle,
          background: isApproved ? "rgba(0,184,81,0.08)" : bgColor,
          border: `2px solid ${isApproved ? "#00B851" : borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={() => { if (!isApproved) onValueChange(field.id, "approved"); }}
      >
        {isApproved ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#00B851" }}>
            <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            <span className="text-xs font-bold text-white">Approved</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: borderColor }}>
            <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            <span className="text-xs font-bold text-white">Approve</span>
          </div>
        )}
      </div>
    );
  }

  // NOTE field — read-only sender-set content displayed to signer
  if (field.type === "note") {
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded`}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: 10,
        }}
      >
        <span className="text-xs italic text-gray-400">{field.value || "Note"}</span>
      </div>
    );
  }

  // STAMP field — one-click stamp button
  if (field.type === "stamp") {
    const isStamped = !!value;
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all select-none`}
        style={{
          ...posStyle,
          background: isStamped ? "rgba(0,184,81,0.08)" : bgColor,
          border: `2px solid ${isStamped ? "#00B851" : borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={() => { if (!isStamped) onValueChange(field.id, "stamped"); }}
      >
        {isStamped ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#00B851" }}>
            <Check size={12} weight="bold" color="white" />
            <span className="text-xs font-bold text-white">Stamped</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: borderColor }}>
            <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M3 18h18v2H3v-2zm2-4h2v3H5v-3zm4-4h2v7H9v-7zm-4 0a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3" /></svg>
            <span className="text-xs font-bold text-white">Stamp</span>
          </div>
        )}
      </div>
    );
  }

  // DECLINE field — red decline button
  if (field.type === "decline") {
    const isDeclined = !!value;
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all select-none`}
        style={{
          ...posStyle,
          background: isDeclined ? "rgba(220,38,38,0.08)" : bgColor,
          border: `2px solid ${isDeclined ? "#DC2626" : borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={() => { if (!isDeclined) onValueChange(field.id, "declined"); }}
      >
        {isDeclined ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#DC2626" }}>
            <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.89 4.88a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.42L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41z" /></svg>
            <span className="text-xs font-bold text-white">Declined</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#DC2626" }}>
            <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.89 4.88a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.42L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41z" /></svg>
            <span className="text-xs font-bold text-white">Decline</span>
          </div>
        )}
      </div>
    );
  }

  // DRAWING field — placeholder stub (real canvas implementation is complex)
  if (field.type === "drawing") {
    const hasDrawing = !!value;
    return (
      <div
        className={`${posClass} flex items-center justify-center rounded cursor-pointer transition-all select-none`}
        style={{
          ...posStyle,
          background: hasDrawing ? "rgba(0,184,81,0.08)" : bgColor,
          border: `2px solid ${hasDrawing ? "#00B851" : borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
        onClick={() => { if (!hasDrawing) onValueChange(field.id, "drawing_placeholder"); }}
      >
        {hasDrawing ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#00B851" }}>
            <Check size={12} weight="bold" color="white" />
            <span className="text-xs font-bold text-white">Drawn</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: borderColor }}>
            <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
            <span className="text-xs font-bold text-white">Draw</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div
      className={`${posClass} flex items-center justify-center rounded`}
      style={{
        ...posStyle,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        zIndex: 10,
      }}
      onClick={handleClick}
    >
      <span className="text-xs text-gray-400">{field.type}</span>
    </div>
  );
}
