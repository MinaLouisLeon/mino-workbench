import { cn } from "@/lib/utils";
import { terminalLines } from "@/content/preview";

const tones = {
  prompt: "text-accent",
  command: "text-text",
  output: "text-text-muted",
  accent: "text-warning",
} as const;

/**
 * The bottom pane of the still life.
 *
 * Split out of `WorkbenchPreview` only to keep both files under the 150-line
 * rule; it has no other reason to be its own module and no props.
 */
export function PreviewTerminal() {
  return (
    <div className="h-40 shrink-0 overflow-hidden bg-surface-sunken px-3 py-2 font-mono leading-relaxed sm:h-44">
      {terminalLines.map((line, index) => (
        <div key={`${index}-${line.text}`} className="flex gap-2">
          {line.tone === "prompt" ? (
            <span className="text-text-faint">{line.text}</span>
          ) : null}
          {line.tone === "command" ? (
            <>
              <span className="text-accent">❯</span>
              <span className={tones.command}>{line.text}</span>
            </>
          ) : null}
          {line.tone === "output" || line.tone === "accent" ? (
            <span className={cn("whitespace-pre", tones[line.tone])}>
              {line.text}
            </span>
          ) : null}
        </div>
      ))}
      <div className="flex gap-2">
        <span className="text-accent">❯</span>
        <span className="inline-block h-4 w-2 bg-accent-strong" />
      </div>
    </div>
  );
}
