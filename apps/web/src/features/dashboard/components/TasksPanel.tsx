"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "@phosphor-icons/react";

interface Task {
  id: string;
  envelopeName: string;
  from: string;
  action: string;
  dueDate?: string;
}

function fetchTasks(): Promise<Task[]> {
  return fetch("/api/envelopes/tasks", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
}

export function TasksPanel() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  return (
    <div className="flex-1 min-w-0">
      <div
        style={{
          border: '1px solid #E0E0E0',
          borderRadius: '8px',
          background: 'white',
          padding: '16px',
        }}
      >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            TASKS
          </h2>
        </div>
        <span className="text-gray-400 text-sm">›</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col py-10 px-2">
          <p className="text-base font-medium" style={{ color: "rgba(19,0,50,0.9)" }}>
            You don&apos;t have any tasks yet
          </p>
          <p className="text-sm mt-1" style={{ color: "rgba(19,0,50,0.5)" }}>
            When you have new tasks assigned to you, they will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
              style={{ borderColor: "#E0E0E0" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#E8E8F0" }}
              >
                <FileText size={18} color="#1B0A3C" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#1B0A3C" }}>
                  {task.envelopeName}
                </p>
                <p className="text-xs text-gray-500">
                  From: {task.from} · {task.action}
                </p>
              </div>
              {task.dueDate && (
                <span className="text-xs text-orange-600 flex-shrink-0">
                  Due {task.dueDate}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
