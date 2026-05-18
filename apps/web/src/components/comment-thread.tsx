"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Smile, Reply } from "lucide-react";
import { Avatar } from "@/components/icons";
import {
  postComment,
  toggleReaction,
  type Comment,
  type Member,
  type ReactionGroup,
} from "@/lib/api";
import { relTime } from "@/lib/time";

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🚀", "👀", "😄"];

function renderBody(body: string, mentions: { member_id: string; name: string }[] = []) {
  if (!body) return null;
  const names = new Set(mentions.map((m) => m.name.split(" ")[0].toLowerCase()));
  const parts = body.split(/(@[A-Za-z][A-Za-z0-9_-]*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("@") && names.has(p.slice(1).toLowerCase())) {
      return (
        <span key={i} className="rounded-sm bg-accent/15 px-1 text-accent">
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function ReactionRow({
  reactions,
  onToggle,
}: {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji)}
          title={r.member_names.join(", ")}
          className={`flex items-center gap-1 rounded-pill border px-2 py-0.5 text-mini ${
            r.reacted
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-border-subtle bg-elevated text-text-secondary hover:bg-row-hover"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-1 rounded-pill border border-dashed border-border-subtle px-2 py-0.5 text-mini text-text-tertiary hover:bg-row-hover"
        >
          <Smile size={12} />
        </button>
        {pickerOpen && (
          <div
            className="absolute left-0 top-7 z-10 flex gap-1 rounded-md border border-border-subtle bg-elevated p-1 shadow-popover"
            onMouseLeave={() => setPickerOpen(false)}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onToggle(e);
                  setPickerOpen(false);
                }}
                className="rounded-sm px-1.5 py-0.5 text-base hover:bg-row-hover"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MentionTextarea({
  workspaceSlug,
  members,
  value,
  onChange,
  onSubmit,
  placeholder,
  rows = 1,
  autoFocus,
}: {
  workspaceSlug: string;
  members: Member[];
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [matches, setMatches] = useState<Member[]>([]);
  const [hi, setHi] = useState(0);
  const [tokenStart, setTokenStart] = useState<number | null>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function updateMatches(text: string, caret: number) {
    const before = text.slice(0, caret);
    const m = /(^|\s)@([A-Za-z][A-Za-z0-9_-]*)?$/.exec(before);
    if (!m) {
      setMatches([]);
      setTokenStart(null);
      return;
    }
    const query = (m[2] || "").toLowerCase();
    setTokenStart(caret - (m[2]?.length ?? 0) - 1);
    setMatches(
      members
        .filter((mem) => mem.name.toLowerCase().includes(query))
        .slice(0, 5)
    );
    setHi(0);
  }

  function pick(mem: Member) {
    if (tokenStart == null || !ref.current) return;
    const t = ref.current;
    const first = mem.name.split(" ")[0];
    const newVal = value.slice(0, tokenStart) + `@${first} ` + value.slice(t.selectionStart);
    onChange(newVal);
    setMatches([]);
    setTokenStart(null);
    requestAnimationFrame(() => {
      const pos = tokenStart + first.length + 2;
      t.focus();
      t.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          updateMatches(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (matches.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((h) => (h + 1) % matches.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((h) => (h - 1 + matches.length) % matches.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              pick(matches[hi]);
              return;
            }
            if (e.key === "Escape") {
              setMatches([]);
              return;
            }
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="w-full resize-none bg-transparent text-small text-text-primary outline-none placeholder:text-text-tertiary"
      />
      {matches.length > 0 && (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-56 rounded-md border border-border-subtle bg-elevated shadow-popover">
          {matches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m);
              }}
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-small ${
                i === hi ? "bg-row-hover text-text-primary" : "text-text-secondary"
              }`}
            >
              <Avatar initials={m.initials} color={m.color} size={18} />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  workspaceSlug,
  identifier,
  members,
  depth = 0,
}: {
  comment: Comment;
  workspaceSlug: string;
  identifier: string;
  members: Member[];
  depth?: number;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  async function onToggleReaction(emoji: string) {
    await toggleReaction(workspaceSlug, comment.id, emoji);
    router.refresh();
  }

  async function submitReply() {
    if (!replyBody.trim()) return;
    await postComment(workspaceSlug, identifier, replyBody.trim(), comment.id);
    setReplyBody("");
    setReplying(false);
    router.refresh();
  }

  return (
    <div className={depth > 0 ? "ml-8 mt-3" : "mt-5"}>
      <div className="flex gap-2.5">
        <Avatar initials={comment.author?.initials ?? "?"} color={comment.author?.color ?? "#5e6ad2"} size={depth > 0 ? 18 : 22} />
        <div className="min-w-0 flex-1 pt-px">
          <header className="flex items-center gap-2 text-mini text-text-tertiary">
            <span className="text-small font-medium text-text-primary">{comment.author?.name ?? "Unknown"}</span>
            <span>{relTime(comment.created_at) || "now"}</span>
          </header>
          <p className="mt-0.5 whitespace-pre-wrap text-small leading-[1.55] text-text-secondary">
            {renderBody(comment.body, comment.mentions)}
          </p>
          <ReactionRow reactions={comment.reactions ?? []} onToggle={onToggleReaction} />
          {depth === 0 && (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-mini text-text-tertiary hover:text-text-secondary"
            >
              <Reply size={12} /> Reply
            </button>
          )}
        </div>
      </div>

      {(comment.replies ?? []).map((r) => (
        <CommentRow
          key={r.id}
          comment={r}
          workspaceSlug={workspaceSlug}
          identifier={identifier}
          members={members}
          depth={depth + 1}
        />
      ))}

      {replying && (
        <div className="ml-8 mt-2 rounded-md border border-border-subtle bg-elevated p-2">
          <MentionTextarea
            workspaceSlug={workspaceSlug}
            members={members}
            value={replyBody}
            onChange={setReplyBody}
            onSubmit={submitReply}
            placeholder={`Reply to ${comment.author?.name ?? "comment"}…`}
            rows={2}
            autoFocus
          />
          <div className="mt-1 flex justify-end gap-2 text-mini text-text-tertiary">
            <button onClick={() => { setReplying(false); setReplyBody(""); }} className="rounded-md px-2 py-0.5 hover:bg-row-hover">Cancel</button>
            <button
              onClick={submitReply}
              disabled={!replyBody.trim()}
              className="rounded-md bg-accent px-2 py-0.5 text-white disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CommentThread({
  workspaceSlug,
  identifier,
  comments,
  members,
}: {
  workspaceSlug: string;
  identifier: string;
  comments: Comment[];
  members: Member[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await postComment(workspaceSlug, identifier, body.trim());
      setBody("");
      setFocused(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {comments.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          workspaceSlug={workspaceSlug}
          identifier={identifier}
          members={members}
        />
      ))}

      <div
        className="mt-4 rounded-md border border-border-subtle bg-elevated p-3 text-small text-text-secondary"
        onClick={() => setFocused(true)}
      >
        <MentionTextarea
          workspaceSlug={workspaceSlug}
          members={members}
          value={body}
          onChange={(v) => {
            setBody(v);
            if (v) setFocused(true);
          }}
          onSubmit={submit}
          placeholder="Leave a reply…  (use @ to mention)"
          rows={focused ? 3 : 1}
        />
        {focused && (
          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2 text-mini text-text-tertiary">
            <span>⌘⏎ to submit · @ to mention</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setBody(""); setFocused(false); }}
                className="rounded-md px-2 py-1 hover:bg-row-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!body.trim() || submitting}
                className="rounded-md bg-accent px-3 py-1 text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Comment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
