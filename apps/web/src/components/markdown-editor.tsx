"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import clsx from "clsx";

/**
 * Live markdown editor: typing `*x*` shows italic x, `**x**` bold, `# x` H1,
 * `- x` bullet list, `1. x` ordered list, `> x` blockquote, `` `x` `` inline
 * code, ``` fenced code. Content is read/written as a plain markdown string,
 * so the rest of the app keeps treating descriptions as markdown without any
 * round-trip surprises.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 120,
}: {
  value: string;
  onChange: (md: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Markdown.configure({ html: false, tightLists: true }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const md = (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "prose-md outline-none",
      },
    },
  });

  return (
    <div
      className={clsx(
        "w-full text-small text-text-primary [&_.ProseMirror]:outline-none",
        // Tighten paragraph rhythm and color the placeholder.
        "[&_.ProseMirror_p]:my-0 [&_.ProseMirror_p+p]:mt-2",
        "[&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:mt-3 [&_.ProseMirror_h1]:text-large [&_.ProseMirror_h1]:font-semibold",
        "[&_.ProseMirror_h2]:mb-1.5 [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:text-default [&_.ProseMirror_h2]:font-semibold",
        "[&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_h3]:mt-2 [&_.ProseMirror_h3]:text-default [&_.ProseMirror_h3]:font-medium",
        "[&_.ProseMirror_ul]:my-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5",
        "[&_.ProseMirror_ol]:my-1 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5",
        "[&_.ProseMirror_li]:my-0.5",
        "[&_.ProseMirror_blockquote]:my-2 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border-strong [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-text-secondary",
        "[&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-row-hover [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-mini [&_.ProseMirror_code]:font-mono",
        "[&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:bg-app [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:text-mini [&_.ProseMirror_pre]:font-mono",
        "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0",
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-text-tertiary [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        className,
      )}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
