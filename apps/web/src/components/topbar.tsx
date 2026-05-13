import clsx from "clsx";

export function Topbar({
  title,
  icon,
  tabs,
  activeTab,
  trailing,
  filters,
}: {
  title: string;
  icon?: React.ReactNode;
  tabs?: { key: string; label: string; href?: string }[];
  activeTab?: string;
  trailing?: React.ReactNode;
  filters?: React.ReactNode;
}) {
  return (
    <header className="flex h-[48px] shrink-0 items-center gap-3 border-b border-border-subtle px-4">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="text-text-tertiary">{icon}</span>}
        <h1 className="truncate text-small font-semibold text-text-primary">{title}</h1>
      </div>

      {tabs && (
        <nav className="flex items-center gap-0.5">
          {tabs.map((t) =>
            t.href ? (
              <a
                key={t.key}
                href={t.href}
                className={clsx(
                  "rounded-md px-2 py-1 text-small",
                  t.key === activeTab
                    ? "bg-row-selected text-text-primary"
                    : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                )}
              >
                {t.label}
              </a>
            ) : (
              <button
                key={t.key}
                className={clsx(
                  "rounded-md px-2 py-1 text-small",
                  t.key === activeTab
                    ? "bg-row-selected text-text-primary"
                    : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                )}
              >
                {t.label}
              </button>
            )
          )}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-1">
        {trailing}
        {filters}
      </div>
    </header>
  );
}
