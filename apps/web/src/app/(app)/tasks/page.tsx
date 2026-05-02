"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, X, Funnel, GearSix } from "@phosphor-icons/react";

interface Task {
  id: string;
  envelopeName: string;
  from: string;
  action: string;
  dueDate?: string;
  assignedDate?: string;
  type?: string;
}

function fetchTasks(): Promise<Task[]> {
  return fetch("/api/envelopes/tasks", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
}

const FILTER_OPTIONS = {
  assignedTo: ["To me", "By me", "Unassigned"],
  assignedDate: ["Last 6 Months", "Last 30 Days", "Last 7 Days", "All Time"],
  taskType: ["Signature Required", "Approval Required", "View Required"],
  dueDate: ["Overdue", "Due Today", "Due This Week"],
};

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const [search, setSearch] = useState("");
  const [assignedTo, setAssignedTo] = useState("To me");
  const [assignedDate, setAssignedDate] = useState("Last 6 Months");
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  const activeFilters = [
    { key: "assignedTo", label: `Assigned to: ${assignedTo}`, clear: () => setAssignedTo("") },
    { key: "assignedDate", label: `Assigned Date: ${assignedDate}`, clear: () => setAssignedDate("") },
  ].filter((f) => {
    if (f.key === "assignedTo") return assignedTo !== "";
    if (f.key === "assignedDate") return assignedDate !== "";
    return false;
  });

  const filtered = tasks.filter((t) =>
    t.envelopeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Page title */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 400,
            color: "rgba(19,0,50,0.9)",
            marginBottom: "28px",
            letterSpacing: "-0.5px",
          }}
        >
          Tasks
        </h1>

        {/* Search + filters row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>

          {/* Search */}
          <div
            style={{
              position: "relative",
              flex: "0 0 360px",
              maxWidth: "360px",
            }}
          >
            <MagnifyingGlass
              size={16}
              weight="bold"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(19,0,50,0.4)",
              }}
            />
            <input
              type="text"
              placeholder="Search Tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                paddingLeft: "36px",
                paddingRight: "12px",
                border: "1px solid rgba(19,0,50,0.2)",
                borderRadius: "4px",
                fontSize: "14px",
                color: "rgba(19,0,50,0.9)",
                background: "white",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4C00FF")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(19,0,50,0.2)")}
            />
          </div>

          {/* Active filter chips */}
          {activeFilters.map((f) => (
            <div
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "white",
                border: "1px solid rgba(19,0,50,0.2)",
                borderRadius: "4px",
                padding: "0 10px",
                height: "40px",
                fontSize: "14px",
                color: "rgba(19,0,50,0.9)",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
              <button
                onClick={f.clear}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  color: "rgba(19,0,50,0.5)",
                }}
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          ))}

          {/* All Filters button */}
          <button
            onClick={() => setShowAllFilters(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "white",
              border: "1px solid rgba(19,0,50,0.2)",
              borderRadius: "4px",
              padding: "0 14px",
              height: "40px",
              fontSize: "14px",
              color: "rgba(19,0,50,0.9)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Funnel size={16} weight="bold" />
            All Filters
          </button>

          {/* Filter count badge */}
          {activeFilters.length > 0 && (
            <span style={{ fontSize: "13px", color: "rgba(19,0,50,0.5)" }}>
              {activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""} applied
            </span>
          )}

          {/* Gear icon */}
          <div style={{ marginLeft: "auto" }}>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(19,0,50,0.5)",
                display: "flex",
                alignItems: "center",
                padding: "4px",
              }}
            >
              <GearSix size={22} weight="regular" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: "72px", background: "#E8E8E8", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "80px",
              gap: "0",
            }}
          >
            {/* Official DocuSign completed-document illustration */}
            <img
              src="/assets/images/completed-document.svg"
              alt="All tasks complete"
              style={{ width: "200px", height: "200px", marginBottom: "24px" }}
            />

            <h2 style={{ fontSize: "22px", fontWeight: 600, color: "rgba(19,0,50,0.9)", marginBottom: "10px" }}>
              You&apos;re all caught up!
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(19,0,50,0.55)", textAlign: "center", maxWidth: "440px", lineHeight: "1.6" }}>
              You have completed all tasks that are assigned to you. You can adjust the filter to see if there are tasks assigned by you, or unassigned.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {filtered.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  background: "white",
                  borderTop: idx === 0 ? "1px solid rgba(19,0,50,0.08)" : "none",
                  borderBottom: "1px solid rgba(19,0,50,0.08)",
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "rgba(19,0,50,0.9)", marginBottom: "4px" }}>
                    {task.envelopeName}
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.5)" }}>
                    From: {task.from} · {task.action}
                  </p>
                </div>
                {task.dueDate && (
                  <span style={{ fontSize: "13px", color: "#D97706" }}>Due {task.dueDate}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Filters side panel */}
      {showAllFilters && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
            onClick={() => setShowAllFilters(false)}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "360px",
              background: "white",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(19,0,50,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 500, color: "rgba(19,0,50,0.9)" }}>All Filters</h3>
              <button
                onClick={() => setShowAllFilters(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(19,0,50,0.5)" }}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Filter search */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(19,0,50,0.06)" }}>
              <div style={{ position: "relative" }}>
                <MagnifyingGlass
                  size={14}
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(19,0,50,0.4)" }}
                />
                <input
                  type="text"
                  placeholder="Search for filters"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    paddingLeft: "30px",
                    border: "1px solid rgba(19,0,50,0.15)",
                    borderRadius: "4px",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
              {/* Applied filters */}
              {activeFilters.length > 0 && (
                <div style={{ paddingTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(19,0,50,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Applied Filters ({activeFilters.length})
                    </span>
                    <button
                      onClick={() => { setAssignedTo(""); setAssignedDate(""); }}
                      style={{ fontSize: "13px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Clear All
                    </button>
                  </div>
                  {activeFilters.map((f) => (
                    <div
                      key={f.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(19,0,50,0.06)",
                        fontSize: "14px",
                        color: "rgba(19,0,50,0.9)",
                      }}
                    >
                      {f.label}
                      <button onClick={f.clear} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(19,0,50,0.4)" }}>
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available filters */}
              <div style={{ paddingTop: "20px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(19,0,50,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Available Filters (3)
                </span>

                {/* Assigned To */}
                <div style={{ marginTop: "12px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(19,0,50,0.8)", marginBottom: "8px" }}>Assigned to</p>
                  {FILTER_OPTIONS.assignedTo.map((opt) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer", fontSize: "14px", color: "rgba(19,0,50,0.8)" }}>
                      <input
                        type="radio"
                        name="assignedTo"
                        checked={assignedTo === opt}
                        onChange={() => setAssignedTo(opt)}
                        style={{ accentColor: "#4C00FF" }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>

                {/* Assigned Date */}
                <div style={{ marginTop: "16px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(19,0,50,0.8)", marginBottom: "8px" }}>Assigned Date</p>
                  {FILTER_OPTIONS.assignedDate.map((opt) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer", fontSize: "14px", color: "rgba(19,0,50,0.8)" }}>
                      <input
                        type="radio"
                        name="assignedDate"
                        checked={assignedDate === opt}
                        onChange={() => setAssignedDate(opt)}
                        style={{ accentColor: "#4C00FF" }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>

                {/* Task Type */}
                <div style={{ marginTop: "16px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(19,0,50,0.8)", marginBottom: "8px" }}>Task Type</p>
                  {FILTER_OPTIONS.taskType.map((opt) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer", fontSize: "14px", color: "rgba(19,0,50,0.8)" }}>
                      <input type="checkbox" style={{ accentColor: "#4C00FF" }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
