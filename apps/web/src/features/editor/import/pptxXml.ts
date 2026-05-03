/**
 * XML helpers for PPTX parsing. PPTX uses several namespace prefixes (`a:`,
 * `p:`, `r:`, `c:`, `dgm:`) that can differ across producers, so all lookups
 * here are prefix-agnostic — we match by local name.
 */

export function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) throw new Error(`XML parse error: ${err.textContent ?? "unknown"}`);
  return doc;
}

export function localName(el: Element): string {
  return el.localName ?? el.tagName.replace(/^[^:]+:/, "");
}

export function childrenByLocal(parent: Element, ln: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i];
    if (localName(c) === ln) out.push(c);
  }
  return out;
}

export function firstChildByLocal(parent: Element, ln: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i];
    if (localName(c) === ln) return c;
  }
  return null;
}

/** Depth-first descendant lookup by local name. */
export function descendantsByLocal(root: Element, ln: string): Element[] {
  const out: Element[] = [];
  const stack: Element[] = [root];
  while (stack.length) {
    const el = stack.pop()!;
    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i];
      if (localName(c) === ln) out.push(c);
      stack.push(c);
    }
  }
  return out;
}

export function firstDescendantByLocal(
  root: Element,
  ln: string,
): Element | null {
  const stack: Element[] = [root];
  while (stack.length) {
    const el = stack.pop()!;
    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i];
      if (localName(c) === ln) return c;
      stack.push(c);
    }
  }
  return null;
}

export function hasDescendantLocal(root: Element, ln: string): boolean {
  return firstDescendantByLocal(root, ln) !== null;
}

/** Namespace-tolerant attr getter: matches `x`, `a:x`, `p:x`, `r:x`, etc. */
export function attr(el: Element, name: string): string | null {
  const direct = el.getAttribute(name);
  if (direct != null) return direct;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const local = a.name.includes(":") ? a.name.split(":").pop() : a.name;
    if (local === name) return a.value;
  }
  return null;
}
