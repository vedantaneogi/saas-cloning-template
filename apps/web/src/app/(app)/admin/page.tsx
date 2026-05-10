import type { Metadata } from "next";
import { AdminClient } from "@/features/admin/components/AdminClient";

export const metadata: Metadata = {
  title: "Admin | DocuSign eSignature",
  description: "Manage your account settings, users, billing, and more.",
};

export default function AdminPage() {
  return <AdminClient />;
}
