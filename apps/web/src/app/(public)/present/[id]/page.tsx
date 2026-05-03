import { PublicPresenter } from "./PublicPresenter";

export default async function PublicPresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicPresenter deckId={id} />;
}
