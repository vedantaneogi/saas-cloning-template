"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, LayoutGrid, List as ListIcon, Check } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";

const GROUP_OPTIONS = [
  { key: "state", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "project", label: "Project" },
  { key: "label", label: "Label" },
  { key: "none", label: "No grouping" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "priority", label: "Priority" },
  { key: "updated", label: "Last updated" },
  { key: "created", label: "Created date" },
  { key: "due", label: "Due date" },
];

export function DisplayOptions() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const display = params.get("display") || "list";
  const group = params.get("group") || "state";
  const sort = params.get("sort") || "default";

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (!value || value === defaultFor(key)) sp.delete(key);
    else sp.set(key, value);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Display options"
        >
          <SlidersHorizontal size={15} />
        </button>
      )}
      align="end"
      width={240}
    >
      {() => (
        <div className="py-1">
          <Header>Display</Header>
          <div className="flex gap-1 px-2 py-1">
            <DisplayChip
              active={display === "list"}
              onClick={() => setParam("display", "list")}
              icon={<ListIcon size={12} />}
              label="List"
            />
            <DisplayChip
              active={display === "board"}
              onClick={() => setParam("display", "board")}
              icon={<LayoutGrid size={12} />}
              label="Board"
            />
          </div>

          <Header>Grouping</Header>
          <PopoverList>
            {GROUP_OPTIONS.map((g) => (
              <PopoverItem key={g.key} active={group === g.key} onClick={() => setParam("group", g.key)}>
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                  {group === g.key ? <Check size={11} className="text-accent" /> : null}
                </span>
                {g.label}
              </PopoverItem>
            ))}
          </PopoverList>

          <Header>Ordering</Header>
          <PopoverList>
            {SORT_OPTIONS.map((s) => (
              <PopoverItem key={s.key} active={sort === s.key} onClick={() => setParam("sort", s.key)}>
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                  {sort === s.key ? <Check size={11} className="text-accent" /> : null}
                </span>
                {s.label}
              </PopoverItem>
            ))}
          </PopoverList>
        </div>
      )}
    </Popover>
  );
}

function defaultFor(key: string): string {
  return { display: "list", group: "state", sort: "default" }[key] ?? "";
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-2 text-micro font-medium uppercase tracking-wider text-text-tertiary">
      {children}
    </div>
  );
}

function DisplayChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-mini",
        active
          ? "border-border-strong bg-row-selected text-text-primary"
          : "border-border-subtle bg-pill text-text-secondary hover:border-border-strong"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
