import Link from "next/link";
import { FileText } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar } from "@/components/icons";
import { NewDocButton } from "@/components/new-doc-button";
import { listDocuments, type Document } from "@/lib/api";

export default async function DocumentsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const docs = await listDocuments(workspace).catch(() => [] as Document[]);

  return (
    <>
      <Topbar
        title="Documents"
        icon={<FileText size={15} />}
        trailing={<NewDocButton workspaceSlug={workspace} />}
      />
      <div className="flex-1 overflow-y-auto">
        {docs.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
            No documents yet.
          </div>
        ) : (
          docs.map((d) => <DocumentRow key={d.id} doc={d} workspaceSlug={workspace} />)
        )}
      </div>
    </>
  );
}

function DocumentRow({ doc, workspaceSlug }: { doc: Document; workspaceSlug: string }) {
  return (
    <Link
      href={`/${workspaceSlug}/document/${doc.slug_id}`}
      className="group flex h-[40px] items-center gap-3 border-b border-border-subtle px-5 text-small hover:bg-row-hover"
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-default">
        {doc.icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{doc.title}</span>
      {doc.project_name && (
        <span className="text-mini text-text-tertiary">{doc.project_name}</span>
      )}
      <span className="text-mini text-text-tertiary">
        {new Date(doc.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
      {doc.creator ? (
        <Avatar initials={doc.creator.initials} color={doc.creator.color} size={18} />
      ) : (
        <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
      )}
    </Link>
  );
}
