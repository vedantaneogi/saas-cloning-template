export type TemplateManifestEntry = {
  id: string;
  name: string;
  subtitle?: string;
  pptxUrl: string;
};

export const TEMPLATES: TemplateManifestEntry[] = [
  {
    id: "temp1",
    name: "Your big idea",
    subtitle: "by Made to Stick",
    pptxUrl: "/templates/temp1.pptx",
  },
];

export function getTemplate(id: string): TemplateManifestEntry | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
