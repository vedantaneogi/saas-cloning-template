import { EditorClient } from "./EditorClient";

type Params = { params: Promise<{ id: string }> };

export default async function PresentationEditorPage({ params }: Params) {
  const { id } = await params;
  return <EditorClient deckId={id} />;
}
