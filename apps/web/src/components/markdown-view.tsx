// Lightweight markdown renderer used by the issue description, create modal preview, etc.
// Supports: # / ## / ### headings, **bold**, *italic*, `inline code`, - bullet, 1. ordered list,
// - [ ] / - [x] checklist, > blockquote, ``` fenced code, --- hr, [text](url) links.

import { Fragment } from "react";

export function MarkdownView({ source }: { source: string }) {
  const blocks = parseBlocks(source || "");
  return (
    <div className="space-y-3 text-default text-text-secondary">
      {blocks.map((b, i) => (
        <Fragment key={i}>{renderBlock(b)}</Fragment>
      ))}
    </div>
  );
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "task"; items: { done: boolean; text: string }[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "quote"; text: string }
  | { kind: "hr" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push({ kind: "code", lang, text: body.join("\n") });
      continue;
    }
    if (line.startsWith("# ")) {
      out.push({ kind: "h", level: 1, text: line.slice(2) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push({ kind: "h", level: 2, text: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push({ kind: "h", level: 3, text: line.slice(4) });
      i++;
      continue;
    }
    if (line.trim() === "---") {
      out.push({ kind: "hr" });
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      out.push({ kind: "quote", text: line.slice(2) });
      i++;
      continue;
    }
    if (/^- \[[ x]\] /.test(line)) {
      const items: { done: boolean; text: string }[] = [];
      while (i < lines.length && /^- \[[ x]\] /.test(lines[i])) {
        items.push({ done: lines[i].startsWith("- [x]"), text: lines[i].slice(5).trim() });
        i++;
      }
      out.push({ kind: "task", items });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push({ kind: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      out.push({ kind: "ol", items });
      continue;
    }
    // Paragraph: collect consecutive non-empty non-special lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("- ") &&
      !lines[i].startsWith("* ") &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ")
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push({ kind: "p", text: para.join(" ") });
  }
  return out;
}

function renderBlock(b: Block) {
  switch (b.kind) {
    case "h":
      if (b.level === 1) return <h1 className="text-title3 font-semibold text-text-primary">{inline(b.text)}</h1>;
      if (b.level === 2) return <h2 className="text-default font-semibold text-text-primary">{inline(b.text)}</h2>;
      return <h3 className="text-small font-semibold text-text-primary">{inline(b.text)}</h3>;
    case "ul":
      return (
        <ul className="ml-5 list-disc space-y-1">
          {b.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="ml-5 list-decimal space-y-1">
          {b.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ol>
      );
    case "task":
      return (
        <ul className="space-y-1">
          {b.items.map((it, i) => (
            <li key={i} className="flex items-center gap-2">
              <input type="checkbox" defaultChecked={it.done} readOnly className="h-3.5 w-3.5 rounded-sm border-border-strong bg-input" />
              <span className={it.done ? "text-text-tertiary line-through" : undefined}>{inline(it.text)}</span>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-md border border-border-subtle bg-pill p-2 text-mini text-text-primary">
          <code>{b.text}</code>
        </pre>
      );
    case "quote":
      return <blockquote className="border-l-2 border-border-strong pl-3 text-text-tertiary">{inline(b.text)}</blockquote>;
    case "hr":
      return <hr className="border-border-subtle" />;
    case "p":
    default:
      return <p>{inline((b as { text: string }).text)}</p>;
  }
}

function inline(text: string): React.ReactNode {
  // Order matters: code first so its contents don't trigger bold/italic.
  const tokens: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  const patterns: { re: RegExp; build: (m: RegExpMatchArray) => React.ReactNode }[] = [
    { re: /`([^`]+)`/, build: (m) => <code key={key++} className="rounded-sm bg-pill px-1 py-0.5 font-mono text-mini text-text-primary">{m[1]}</code> },
    { re: /\*\*([^*]+)\*\*/, build: (m) => <strong key={key++} className="font-semibold text-text-primary">{m[1]}</strong> },
    { re: /(?<!\*)\*([^*]+)\*(?!\*)/, build: (m) => <em key={key++}>{m[1]}</em> },
    { re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/, build: (m) => <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{m[1]}</a> },
  ];
  while (rest.length > 0) {
    let bestIdx = Infinity;
    let bestPattern: typeof patterns[number] | null = null;
    let bestMatch: RegExpMatchArray | null = null;
    for (const p of patterns) {
      const m = rest.match(p.re);
      if (m && m.index !== undefined && m.index < bestIdx) {
        bestIdx = m.index;
        bestPattern = p;
        bestMatch = m;
      }
    }
    if (!bestPattern || !bestMatch || bestIdx === Infinity) {
      tokens.push(rest);
      break;
    }
    if (bestIdx > 0) tokens.push(rest.slice(0, bestIdx));
    tokens.push(bestPattern.build(bestMatch));
    rest = rest.slice(bestIdx + bestMatch[0].length);
  }
  return tokens;
}
