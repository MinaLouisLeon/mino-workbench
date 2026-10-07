import type { ModalFrameProps } from "./types";

const TONE_BORDERS = {
  default: "border-borderStrong",
  danger: "border-danger",
} as const;

/**
 * The frame a window-wide dialog sits in: a dimmed backdrop, a panel, a
 * heading. Escape cancels, as it does for the context menu that usually
 * opened the dialog.
 *
 * Window-wide (`fixed`) rather than over one pane, because the dialogs that
 * use it are opened from a context menu, and a pane that has scrolled since
 * would carry a pane-sized dialog off with it.
 */
export function ModalFrame({ title, tone = "default", onCancel, children }: ModalFrameProps) {
  return (
    <div
      role={tone === "danger" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onCancel();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-surfaceSunken/80 p-4"
    >
      <div
        className={`flex w-full max-w-sm flex-col gap-3 rounded border bg-surfaceRaised p-4 ${TONE_BORDERS[tone]}`}
      >
        <h2 className="text-sm font-medium text-text">{title}</h2>
        {children}
      </div>
    </div>
  );
}
