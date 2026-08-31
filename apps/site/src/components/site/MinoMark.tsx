type MinoMarkProps = {
  className?: string;
};

/**
 * The app mark: an M drawn as a terminal would draw it, plus a cursor block.
 *
 * The geometry is copied from apps/desktop/src-tauri/icons/logo.svg, which is
 * the source of truth for every icon the desktop app ships. The colours are
 * not copied: that file hard-codes them because it is loaded before any
 * JavaScript could hand it a token, and this one is a component, so it can
 * paint with classes and keep the token file the only place a colour lives.
 */
export function MinoMark({ className }: MinoMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label="Mino Workbench"
      className={className}
    >
      <rect width="512" height="512" rx="112" className="fill-surface-sunken" />
      <path
        d="M120 360 V 180 L 216 300 L 312 180 V 360"
        fill="none"
        strokeWidth="44"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit="8"
        className="stroke-accent"
      />
      <rect
        x="352"
        y="316"
        width="48"
        height="44"
        className="fill-accent-strong"
      />
    </svg>
  );
}
