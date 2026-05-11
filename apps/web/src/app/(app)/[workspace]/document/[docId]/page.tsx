import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { DocumentEditor } from "@/components/document-editor";
import { getDocument, NotFoundError } from "@/lib/api";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; docId: string }>;
}) {
  const { workspace, docId } = await params;
  let doc;
  try {
    doc = await getDocument(workspace, docId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <>
      <Topbar title={doc.title} icon={<FileText size={15} />} />
      <DocumentEditor workspaceSlug={workspace} doc={doc} />
    </>
  );
}
