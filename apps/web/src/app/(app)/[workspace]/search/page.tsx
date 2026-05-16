import { SearchPage } from "@/components/search-page";

export default async function WorkspaceSearchPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <SearchPage workspaceSlug={workspace} />;
}
