import { cn } from "@/lib/utils";
import { transports } from "@/content/features";

/**
 * The three implementations, including the one that is not finished.
 *
 * Saying so is the point. An unbuilt method in this codebase returns a typed
 * `Unimplemented` that renders as a sentence, rather than panicking or
 * pretending, and a table that quietly listed two transports would be the
 * marketing version of the thing the code refuses to do.
 */
export function Transports() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-raised">
      {transports.map((transport) => (
        <div key={transport.name} className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold">{transport.name}</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[11px]",
                transport.state === "working"
                  ? "bg-accent-muted text-accent"
                  : "bg-warning-muted text-warning",
              )}
            >
              {transport.status}
            </span>
            {/* Full width on a narrow screen, where wrapping it while it
                is still right-aligned strands it under the badge. */}
            <code className="w-full font-mono text-[11px] text-text-faint sm:ml-auto sm:w-auto">
              {transport.path}
            </code>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-text-muted">
            {transport.note}
          </p>
        </div>
      ))}
    </div>
  );
}
