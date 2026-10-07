import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  GitBranch,
  Search,
  TerminalSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PreviewTerminal } from "@/components/site/PreviewTerminal";
import { treeRows, editorLines } from "@/content/preview";

/**
 * A still life of the three panes.
 *
 * Deliberately not a screenshot: a screenshot goes stale the first time a
 * colour token moves, and this is built from the same tokens the app paints
 * with, so it cannot. It is also not interactive - it is a picture, and the
 * whole thing is hidden from the accessibility tree because a reader hearing
 * a fake file tree read out has been told nothing.
 */
export function WorkbenchPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border-strong bg-surface-sunken shadow-2xl"
    >
      <TitleBar />
      <div className="flex h-[22rem] text-xs sm:h-[26rem]">
        <ActivityRail />
        <FileTree />
        <div className="flex min-w-0 flex-1 flex-col">
          <Editor />
          <PreviewTerminal />
        </div>
      </div>
    </div>
  );
}

function TitleBar() {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-2.5">
      <div className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
      </div>
      <span className="ml-2 font-mono text-xs text-text-faint">
        mino-workbench
      </span>
      <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-xs text-text-muted">
        <GitBranch className="size-3" />
        dev
        <span className="size-1.5 rounded-full bg-warning" />
      </span>
    </div>
  );
}

function ActivityRail() {
  const icons = [Folder, Search, GitBranch, TerminalSquare];

  return (
    <div className="flex w-11 flex-col items-center gap-1 border-r border-border bg-surface py-3">
      {icons.map((Icon, index) => (
        <span
          key={Icon.displayName ?? index}
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            index === 0 ? "bg-surface-hover text-accent" : "text-text-faint",
          )}
        >
          <Icon className="size-4" />
        </span>
      ))}
    </div>
  );
}

function FileTree() {
  return (
    <div className="hidden w-52 shrink-0 flex-col border-r border-border bg-surface py-2 sm:flex">
      {treeRows.map((row) => (
        <div
          key={`${row.depth}-${row.name}`}
          className="flex items-center gap-1.5 px-2 py-[3px] font-mono text-text-muted"
          style={{ paddingLeft: `${row.depth * 12 + 8}px` }}
        >
          {row.kind === "folder" ? (
            row.open ? (
              <ChevronDown className="size-3 shrink-0 text-text-faint" />
            ) : (
              <ChevronRight className="size-3 shrink-0 text-text-faint" />
            )
          ) : (
            <File className="size-3 shrink-0 text-text-faint" />
          )}
          <span className="truncate">{row.name}</span>
          {row.status ? (
            <span
              className={cn(
                "ml-auto font-mono text-[10px]",
                row.status === "modified" ? "text-warning" : "text-diff-added",
              )}
            >
              {row.status === "modified" ? "M" : "A"}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Editor() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden border-b border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <File className="size-3 text-text-faint" />
        <span className="font-mono text-text-muted">transport.rs</span>
        <span className="size-1.5 rounded-full bg-warning" />
      </div>
      <pre className="overflow-hidden px-3 py-2 font-mono leading-relaxed">
        {editorLines.map((line) => (
          <div key={line.number} className="flex gap-4">
            <span className="w-6 shrink-0 text-right text-text-faint">
              {line.number}
            </span>
            <span className="text-text">{line.text}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
