import { VersionHistoryClient } from "./VersionHistoryClient";

type Params = { params: Promise<{ id: string }> };

export default async function VersionHistoryPage({ params }: Params) {
  const { id } = await params;
  return <VersionHistoryClient deckId={id} />;
}
