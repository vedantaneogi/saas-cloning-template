import JSZip from "jszip";

export type PptxErrorKind =
  | "corrupt"
  | "encrypted"
  | "not-pptx"
  | "empty"
  | "unknown";

export class PptxError extends Error {
  readonly kind: PptxErrorKind;
  constructor(kind: PptxErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = "PptxError";
  }
}

export type PptxZip = {
  readText(path: string): Promise<string | null>;
  readBinary(path: string): Promise<Uint8Array | null>;
  has(path: string): boolean;
};

export async function openPptx(file: File): Promise<PptxZip> {
  if (!file || file.size === 0) {
    throw new PptxError("empty", "File is empty.");
  }
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new PptxError("corrupt", "Could not read file.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new PptxError("corrupt", "File is not a valid ZIP archive.");
  }

  // Password-protected Office files are wrapped in a Compound File Binary
  // container with an `EncryptedPackage` stream — not a real ZIP. Those will
  // have failed `loadAsync`. A rarer pattern is an Agile-encrypted part inside
  // a valid ZIP; detect those here.
  if (zip.file("EncryptedPackage") || zip.file("EncryptionInfo")) {
    throw new PptxError("encrypted", "File is password-protected.");
  }

  if (!zip.file("ppt/presentation.xml")) {
    throw new PptxError("not-pptx", "Not a .pptx file.");
  }

  return {
    has: (path: string) => zip.file(path) !== null,
    async readText(path: string) {
      const entry = zip.file(path);
      if (!entry) return null;
      return entry.async("string");
    },
    async readBinary(path: string) {
      const entry = zip.file(path);
      if (!entry) return null;
      return entry.async("uint8array");
    },
  };
}

/**
 * Resolve a relationship `Target` (which may be relative, e.g.
 * `../media/image1.png`) against the directory of the owning part.
 */
export function resolveRelTarget(partPath: string, target: string): string {
  if (target.startsWith("/")) return target.replace(/^\/+/, "");
  const dir = partPath.split("/").slice(0, -1);
  const segs = target.split("/");
  for (const seg of segs) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") dir.pop();
    else dir.push(seg);
  }
  return dir.join("/");
}

export type RelsMap = Map<string, { target: string; type: string }>;

export async function readRels(
  zip: PptxZip,
  partPath: string,
): Promise<RelsMap> {
  const dir = partPath.split("/").slice(0, -1).join("/");
  const name = partPath.split("/").pop() ?? partPath;
  const relsPath = `${dir}/_rels/${name}.rels`;
  const out: RelsMap = new Map();
  const text = await zip.readText(relsPath);
  if (!text) return out;
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const rels = doc.getElementsByTagName("Relationship");
  for (let i = 0; i < rels.length; i++) {
    const r = rels[i];
    const id = r.getAttribute("Id");
    const target = r.getAttribute("Target");
    const type = r.getAttribute("Type") ?? "";
    if (id && target) out.set(id, { target, type });
  }
  return out;
}
