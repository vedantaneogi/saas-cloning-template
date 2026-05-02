"use client";

import { CheckCircle, Check } from "@phosphor-icons/react";

interface FieldNavigatorProps {
  currentFieldIndex: number;
  totalFields: number;
  completedCount: number;
  hasStarted: boolean;
  isComplete: boolean;
  isFinishing?: boolean;
  onStart: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export function FieldNavigator({
  currentFieldIndex,
  totalFields,
  completedCount,
  hasStarted,
  isComplete,
  isFinishing,
  onStart,
  onNext,
  onFinish,
}: FieldNavigatorProps) {
  if (!hasStarted) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div
          className="flex items-center gap-4 px-6 py-3.5 rounded-full shadow-2xl"
          style={{ background: "#1B0A3C" }}
        >
          <span className="text-sm text-white/70">
            {totalFields === 0
              ? "No required fields"
              : `${totalFields} required field${totalFields !== 1 ? "s" : ""} to complete`}
          </span>
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black transition-all hover:scale-105"
            style={{ background: "#F59E0B", color: "#1B0A3C" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M8 5v14l11-7z" />
            </svg>
            START
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div
          className="flex items-center gap-4 px-6 py-3.5 rounded-full shadow-2xl"
          style={{ background: "#1B0A3C" }}
        >
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} weight="fill" />
            <span className="text-sm font-semibold">All {totalFields} fields complete!</span>
          </div>
          <button
            onClick={onFinish}
            disabled={isFinishing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black transition-all disabled:opacity-70 hover:scale-105"
            style={{ background: "#00B851", color: "white" }}
          >
            {isFinishing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Finishing...
              </>
            ) : (
              <>
                <Check size={14} weight="bold" />
                FINISH
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const progressPct = totalFields > 0 ? (completedCount / totalFields) * 100 : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-4 px-6 py-3.5 rounded-full shadow-2xl"
        style={{ background: "#1B0A3C" }}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {/* Mini progress ring */}
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
              <circle
                cx="16" cy="16" r="12"
                fill="none"
                strokeWidth="3"
                stroke="rgba(255,255,255,0.15)"
              />
              <circle
                cx="16" cy="16" r="12"
                fill="none"
                strokeWidth="3"
                stroke="#F59E0B"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - progressPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ fontSize: "9px" }}>
              {completedCount}/{totalFields}
            </span>
          </div>

          <div className="text-white/70 text-sm">
            <span className="font-semibold text-white">
              Field {Math.min(currentFieldIndex + 1, totalFields)}
            </span>
            {" "}of {totalFields}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black transition-all hover:scale-105"
          style={{ background: "#F59E0B", color: "#1B0A3C" }}
        >
          NEXT
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
