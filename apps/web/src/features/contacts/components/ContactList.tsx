"use client";

import { useState } from "react";
import { Users, Trash } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, getRecipientColor } from "@/lib/utils";
import type { Contact } from "../api";

interface ContactListProps {
  contacts: Contact[];
  isLoading: boolean;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onAddContact: () => void;
}

function ContactRowMenu({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="More actions"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-[140px]"
            style={{ borderColor: "rgba(19, 0, 50, 0.1)" }}
          >
            <button
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{ color: "#9E9E9E" }}>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(contact.email);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{ color: "#9E9E9E" }}>
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              Copy Email
            </button>
            <div className="border-t my-1" style={{ borderColor: "rgba(19, 0, 50, 0.1)" }} />
            <button
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
              style={{ color: "#D93025" }}
            >
              <Trash size={13} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ContactList({
  contacts,
  isLoading,
  onEdit,
  onDelete,
  onAddContact,
}: ContactListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead
          className="sticky top-0 bg-white border-b z-10"
          style={{ borderColor: "rgba(19, 0, 50, 0.1)" }}
        >
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(19, 0, 50, 0.4)" }}>
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(19, 0, 50, 0.4)" }}>
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(19, 0, 50, 0.4)" }}>
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(19, 0, 50, 0.4)" }}>
              Last Sent To
            </th>
            <th className="px-4 py-3 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "rgba(19, 0, 50, 0.1)" }}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5} className="px-4 py-3">
                  <div className="h-5 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            ))
          ) : contacts.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "#F0EBFF" }}
                  >
                    <Users size={28} color="rgba(19,0,50,0.9)" weight="fill" />
                  </div>
                  <p className="text-base font-semibold" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
                    No contacts yet
                  </p>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Add contacts to quickly fill in recipient information when sending envelopes.
                  </p>
                  <button
                    onClick={onAddContact}
                    className="mt-2 px-5 py-2 rounded text-sm font-semibold text-white transition-colors"
                    style={{ background: "#260559" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#3a0880")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#260559")}
                  >
                    Add Contact
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            contacts.map((contact, idx) => (
              <tr
                key={contact.id}
                className="transition-colors cursor-pointer group"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F9F9FB")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => onEdit(contact)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={contact.name}
                      size="sm"
                      color={getRecipientColor(idx)}
                      textColor="rgba(19, 0, 50, 0.85)"
                    />
                    <span className="font-medium" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
                      {contact.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3" style={{ color: "rgba(19, 0, 50, 0.6)" }}>{contact.email}</td>
                <td className="px-4 py-3" style={{ color: "rgba(19, 0, 50, 0.6)" }}>{contact.company ?? "—"}</td>
                <td className="px-4 py-3" style={{ color: "rgba(19, 0, 50, 0.6)" }}>
                  {contact.lastSentAt ? formatDate(contact.lastSentAt) : "—"}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(contact)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                    <ContactRowMenu
                      contact={contact}
                      onEdit={() => onEdit(contact)}
                      onDelete={() => onDelete(contact)}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
