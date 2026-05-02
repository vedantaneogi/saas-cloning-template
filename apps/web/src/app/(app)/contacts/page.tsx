"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CaretLeft, CaretRight, Trash } from "@phosphor-icons/react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { ContactList } from "@/features/contacts/components/ContactList";
import { ContactDialog } from "@/features/contacts/components/ContactDialog";
import { getContacts, createContact, updateContact, deleteContact } from "@/features/contacts/api";
import type { Contact } from "@/features/contacts/api";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search, page],
    queryFn: () => getContacts({ search, page, perPage }),
    placeholderData: (prev) => prev,
  });

  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const createMut = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDialogOpen(false);
      setSaveError(null);
    },
    onError: () => setSaveError("Failed to create contact. Please try again."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateContact>[1] }) =>
      updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDialogOpen(false);
      setEditingContact(null);
      setSaveError(null);
    },
    onError: () => setSaveError("Failed to update contact. Please try again."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDeleteConfirm(null);
    },
  });

  const handleOpenAdd = () => {
    setEditingContact(null);
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSave = (data: { name: string; email: string; company?: string; phone?: string }) => {
    setSaveError(null);
    if (editingContact) {
      updateMut.mutate({ id: editingContact.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: "#F8F8F8" }}
    >
      <div className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full px-6 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-2xl"
              style={{ color: "rgba(19, 0, 50, 0.9)", fontWeight: 400, fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif" }}
            >
              Contacts
            </h1>
            {total > 0 && (
              <p className="text-sm mt-0.5" style={{ color: "rgba(19, 0, 50, 0.6)" }}>
                {total} contact{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button variant="primary" size="md" onClick={handleOpenAdd}>
            <Plus size={16} />
            Add Contact
          </Button>
        </div>

        {/* Main card */}
        <div
          className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg border"
          style={{ borderColor: "rgba(19, 0, 50, 0.1)" }}
        >
          {/* Table toolbar */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: "rgba(19, 0, 50, 0.1)" }}
          >
            <SearchInput
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-72"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="text-sm font-medium transition-colors"
                style={{ color: "rgba(19, 0, 50, 0.9)" }}
              >
                Clear
              </button>
            )}
            <div className="flex-1" />
            {total > 0 && (
              <span className="text-xs text-gray-400">
                {contacts.length} of {total}
              </span>
            )}
          </div>

          {/* Contact table */}
          <ContactList
            contacts={contacts}
            isLoading={isLoading}
            onEdit={handleOpenEdit}
            onDelete={setDeleteConfirm}
            onAddContact={handleOpenAdd}
          />

          {/* Pagination */}
          {!isLoading && total > perPage && (
            <div
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: "rgba(19, 0, 50, 0.1)" }}
            >
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <CaretLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, pages) }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-sm transition-colors ${
                        page === p
                          ? "bg-gray-200 font-semibold"
                          : "hover:bg-gray-100"
                      }`}
                      style={{ color: page === p ? "rgba(19, 0, 50, 0.9)" : "rgba(19, 0, 50, 0.6)" }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <CaretRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <ContactDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingContact(null);
          setSaveError(null);
        }}
        onSave={handleSave}
        isSaving={isSaving}
        contact={editingContact}
        error={saveError}
      />

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#FFEBEE" }}
              >
                <Trash size={20} color="#D93025" />
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: "rgba(19, 0, 50, 0.9)" }}>
                  Delete Contact
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-medium">{deleteConfirm.name}</span>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteConfirm.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
