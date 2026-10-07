import type { ReactNode } from "react";

/** Shared prop shapes for the presentational components in this folder. */
export type NoticeVariant = "info" | "warning" | "danger";

export interface NoticeProps {
  variant: NoticeVariant;
  title?: string;
  children: ReactNode;
}

export interface PaneProps {
  title: string;
  /** Rendered on the right of the header: breadcrumb, status, actions. */
  accessory?: ReactNode;
  children: ReactNode;
}

export interface StatusMessageProps {
  title: string;
  description?: string;
  tone?: NoticeVariant;
}

/**
 * One line of a context menu. Built by a feature hook - which knows what the
 * right-clicked thing is and what can be done to it - and drawn by
 * `ContextMenu`, which knows neither.
 */
export type ContextMenuEntry =
  | ContextMenuAction
  | { kind: "separator"; id: string }
  /** A quiet label over a group, e.g. "Commit type". Not focusable. */
  | { kind: "heading"; id: string; label: string };

export interface ContextMenuAction {
  kind: "action";
  id: string;
  label: string;
  onSelect: () => void;
  /** Shown, and skipped by the keyboard. `hint` says why. */
  disabled?: boolean;
  /** The destructive tone, for the entries that cannot be taken back. */
  danger?: boolean;
  /** Display only, e.g. "Ctrl+S". The shortcut itself lives elsewhere. */
  shortcut?: string;
  /** The tooltip; on a disabled entry, the reason it is disabled. */
  hint?: string;
}

/** Where a menu opens and what it holds. */
export interface ContextMenuRequest {
  x: number;
  y: number;
  entries: ContextMenuEntry[];
}

export interface ModalFrameProps {
  title: string;
  /** `danger` for a dialog whose confirm cannot be taken back. */
  tone?: "default" | "danger";
  onCancel: () => void;
  children: ReactNode;
}
