# Components

## Shared, presentational

`apps/ui/src/components/ui/` - check here before writing new markup.

| Component | Props | Used by |
| --- | --- | --- |
| `Pane` | `title`, `accessory?`, `children` | all three panes |
| `Notice` | `variant` (`info`/`warning`/`danger`), `title?`, `children` | terminal fallback, exit, errors; start-screen failures |
| `StatusMessage` | `title`, `description?`, `tone?` | every pane's empty, loading and error body |

`Pane` renders a labelled `section` with a header strip and a scrollable body,
so the three panes cannot drift apart visually or in the accessibility tree.
`Notice` maps `danger` to `role="alert"` and the others to `role="status"`.

Prop shapes live in `components/ui/types.ts`; nothing declares them inline.

## Feature components

| Feature | Component | Notes |
| --- | --- | --- |
| start-screen | `StartScreen` | Presentational; wiring in `useConnectionOptions` |
| start-screen | `ConnectionOption` | One entry point; shared by local and SSH so a third is a data change |
| workbench | `AppShell` | Start screen until connected, `Workbench` after |
| workbench | `Workbench` | Three resizable panes, persisted splits |
| workbench | `WorkbenchHeader` | Label, breadcrumb, "Close folder" |
| workbench | `Breadcrumb` | Segments from Nushell `path split`, degrading to a TS split |
| file-tree | `FileTreePane` / `TreeRows` / `TreeRow` / `TreeRowParts` | Compound row, see the flow doc |
| viewer | `ViewerPane` | CodeMirror mount plus guard states |
| terminal | `TerminalPane` | xterm mount plus notices |

## The compound row

`TreeRow` is the only repeated list item in the app, so it is built as a
compound component:

```tsx
<TreeRowProvider value={{ row, selected, onActivate, onExpandKey }}>
  <TreeRow>
    <TreeRow.Indent />
    <TreeRow.Chevron />
    <TreeRow.Icon />
    <TreeRow.Label />
    <TreeRow.Status />
  </TreeRow>
</TreeRowProvider>
```

Each part calls `useTreeRow()`. Reordering or replacing a part needs no prop
changes anywhere.

## Colours

`apps/ui/src/theme/tokens.ts` is the only file in the app that contains a
colour value. Tailwind reads it, so every class is a named token
(`bg-surface`, `text-textMuted`, `ring-accentStrong`). The xterm theme
(`theme/terminalTheme.ts`) and the CodeMirror theme (`theme/editorTheme.ts`)
take colours as JavaScript strings and read the same object by name. A new
colour is added as a named token first.
