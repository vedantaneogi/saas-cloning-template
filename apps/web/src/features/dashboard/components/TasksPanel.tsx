"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PenNib, Eye, DotsThree, Clock } from "@phosphor-icons/react";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.45)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const BORDER_COLOR = "#E0E0E0";
const ACCENT_COLOR = "#4C00FF";

interface Task {
  id: string;
  subject: string;
  status: string;
  from_name: string;
  action: string;
  recipients_total: number;
  recipients_completed: number;
  created_at?: string;
  updated_at?: string;
}

function fetchTasks(): Promise<Task[]> {
  return fetch("/api/envelopes/tasks", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
}

export function TasksPanel() {
  const router = useRouter();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  return (
    <div className="flex-1 min-w-0">
      <div
        style={{
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: "8px",
          background: "white",
          overflow: "hidden",
          fontFamily: DS_FONT,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}
        >
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              color: SECONDARY_TEXT,
              fontFamily: DS_FONT,
              margin: 0,
            }}
          >
            TASKS
          </h2>
          <button
            onClick={() => router.push("/agreements?filter=action-required")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: ACCENT_COLOR,
              fontSize: "13px",
              fontFamily: DS_FONT,
              padding: 0,
            }}
          >
            View all ›
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div style={{ padding: "12px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: "64px",
                  background: "#F3F4F6",
                  borderRadius: "6px",
                  marginBottom: "8px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: "40px 20px" }}>
            <p
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: PRIMARY_TEXT,
                margin: "0 0 6px",
                fontFamily: DS_FONT,
              }}
            >
              You don&apos;t have any tasks yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: MUTED_TEXT,
                margin: 0,
                fontFamily: DS_FONT,
              }}
            >
              When you have new tasks assigned to you, they will show up here.
            </p>
          </div>
        ) : (
          <div>
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                onClick={() => router.push(`/agreements/${task.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderBottom: idx < tasks.length - 1 ? `1px solid ${BORDER_COLOR}` : "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: task.action === "Waiting for Others"
                      ? "rgba(19,0,50,0.05)"
                      : "rgba(76,0,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {task.action === "Needs to View" ? (
                    <Eye size={18} color={ACCENT_COLOR} weight="fill" />
                  ) : task.action === "Waiting for Others" ? (
                    <Clock size={18} color="rgba(19,0,50,0.4)" weight="fill" />
                  ) : (
                    <PenNib size={18} color={ACCENT_COLOR} weight="fill" />
                  )}
                </div>

                {/* Left text block: action + from */}
                <div style={{ minWidth: "140px", flexShrink: 0 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: PRIMARY_TEXT,
                      margin: "0 0 2px",
                      fontFamily: DS_FONT,
                    }}
                  >
                    {task.action}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: MUTED_TEXT,
                      margin: 0,
                      fontFamily: DS_FONT,
                    }}
                  >
                    {task.from_name ? `From: ${task.from_name}` : ""}
                  </p>
                </div>

                {/* Subject — takes remaining space */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      color: SECONDARY_TEXT,
                      margin: 0,
                      fontFamily: DS_FONT,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.subject}
                  </p>
                </div>

                {/* Kebab menu */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: MUTED_TEXT,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <DotsThree size={20} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
