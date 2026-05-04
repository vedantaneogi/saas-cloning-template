"use client";

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
  /** All field values — needed for conditional visibility and formula calculation */
  allFieldValues?: Record<string, string>;
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
  signingToken,
  inlinePositioned,
}: SigningFieldProps) {
  const isCompleted = !!value;

  const posStyle: React.CSSProperties = inlinePositioned
    ? { width: "100%", height: "100%" }
    : { left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%` };
  const posClass = inlinePositioned ? "relative" : "absolute";

  // Feature: Conditional Fields — hide if the controlling checkbox is not checked
  if (field.conditionalOn) {
    const controllingValue = allFieldValues[field.conditionalOn];
    if (controllingValue !== "checked") {
      return null;
    }
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
    if (isCompleted) return;
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
          isCurrentField && !isCompleted && "animate-pulse",
        )}
        style={{
          ...posStyle,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
          animationDuration: "2s",
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

  // TEXT, NAME, EMAIL, COMPANY, TITLE fields — inline input
  if (["text", "name", "email", "company", "title"].includes(field.type)) {
    return (
      <div
        className={posClass}
        style={{
          ...posStyle,
          zIndex: isCurrentField ? 15 : 10,
        }}
      >
        <input
          type={field.type === "email" ? "email" : "text"}
          value={value || ""}
          onChange={(e) => onValueChange(field.id, e.target.value)}
          placeholder={
            field.type === "name" ? "Full Name" :
            field.type === "email" ? "Email Address" :
            field.type === "company" ? "Company Name" :
            field.type === "title" ? "Title" :
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

  // FORMULA field — calculate result from other field values
  if (field.type === "formula") {
    const formulaStr = field.formula ?? "";
    let displayValue = "—";
    if (formulaStr) {
      try {
        // Replace field ID tokens (must contain a letter/underscore) with their numeric values
        const evaluated = formulaStr.replace(/[a-zA-Z_][a-zA-Z0-9_-]*/g, (token) => {
          const v = allFieldValues[token];
          return v !== undefined ? String(parseFloat(v) || 0) : "0";
        });
        if (/^[\d\s+\-*/().]+$/.test(evaluated)) {
          const tokens = evaluated.match(/(\d+\.?\d*|[+\-*/()])/g) ?? [];
          let acc = 0;
          let op = "+";
          for (const t of tokens) {
            if ("+-*/".includes(t)) { op = t; }
            else if (t !== "(" && t !== ")") {
              const n = parseFloat(t);
              if (op === "+") acc += n;
              else if (op === "-") acc -= n;
              else if (op === "*") acc *= n;
              else if (op === "/") acc = n !== 0 ? acc / n : NaN;
            }
          }
          displayValue = isNaN(acc) ? "Error" : String(acc);
        } else {
          displayValue = "Invalid formula";
        }
      } catch {
        displayValue = "Error";
      }
    }
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
          ƒ {displayValue}
        </span>
      </div>
    );
  }

  // ATTACHMENT field — click to upload a file
  if (field.type === "attachment") {
    const hasFile = !!value && value !== "";
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
          input.accept = ".pdf,.doc,.docx,image/png,image/jpeg";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const MAX_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
              alert("File must be under 10MB.");
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
                    onValueChange(field.id, file.name);
                  } else {
                    alert("Attachment upload failed. Please try again.");
                  }
                };
                reader.readAsDataURL(file);
              } catch {
                alert("Attachment upload failed. Please try again.");
              }
            } else {
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
              {value}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <svg viewBox="0 0 24 24" fill={borderColor} width="14" height="14">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: borderColor, fontSize: "9px" }}>
              Click to upload
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

  // PAYMENT field — placeholder (no real payment processing)
  if (field.type === "payment") {
    const isPaid = value === "payment_completed";
    const amountDollars = field.paymentAmount != null
      ? (field.paymentAmount / 100).toFixed(2)
      : "0.00";

    return (
      <div
        className={`${posClass} flex items-center justify-center rounded`}
        style={{
          ...posStyle,
          background: isPaid ? "rgba(0,184,81,0.08)" : bgColor,
          border: `2px solid ${isPaid ? "#00B851" : borderColor}`,
          zIndex: isCurrentField ? 15 : 10,
        }}
      >
        {isPaid ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#00B851" }}>
            <Check size={12} weight="bold" color="white" />
            <span className="text-xs font-bold text-white">Paid ${amountDollars}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 px-2 py-1 cursor-pointer"
            onClick={() => onValueChange(field.id, "payment_completed")}
          >
            <svg viewBox="0 0 24 24" fill={borderColor} width="12" height="12">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
            </svg>
            <span className="text-xs font-bold" style={{ color: borderColor }}>
              Pay ${amountDollars}
            </span>
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
