import { MinoMark } from "@/components/site/MinoMark";
import { footer, site } from "@/content/meta";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            <MinoMark className="size-6" />
            <span className="text-sm font-semibold tracking-tight">
              {site.name}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-faint">
            {footer.blurb}
          </p>
        </div>

        <nav className="flex flex-col gap-3">
          {footer.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-text-muted transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
