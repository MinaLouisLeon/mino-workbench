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
| workbench | `Workbench` | Provides the sidebar's state around `WorkbenchPanes` |
| workbench | `WorkbenchPanes` | The rail plus three resizable panes, persisted splits |
| workbench | `WorkbenchHeader` | Label, breadcrumb, "Close folder" |
| workbench | `Breadcrumb` | Segments from Nushell `path split`, degrading to a TS split |
| file-tree | `FileTreePane` / `TreeRows` / `TreeRow` / `TreeRowParts` | Compound row, see the flow doc |
| git | `GitBranchStatus` | Header strip: branch, dirty marker, ahead/behind. Takes no props - reads `GitStatusContext` |
| source-control | `SourceControlPane` / `ChangeGroup` / `ChangeRow` / `ChangeRowParts` / `CommitBox` / `DiscardConfirm` | The third rail view. `DiscardConfirm` is an `alertdialog` whose confirm button names the consequence |
| sidebar | `ActivityBar` / `ActivityBarButton` | The icon rail; one button per entry in `views.ts` |
| sidebar | `SidebarPanel` | Renders every view, hiding the inactive ones rather than unmounting them |
| search | `SearchPane` / `SearchField` / `SearchResults` | Presentational; wiring in `useFileSearch` |
| search | `SearchRow` / `SearchRowParts` | Compound row, like the tree's |
| search | `HighlightedText` | Marks the characters the Rust matcher matched |
| viewer | `ViewerPane` | CodeMirror mount plus guard states |
| terminal | `TerminalPane` | xterm mount plus notices |

## The compound rows

Repeated list items are built as compound components. There are three:
`TreeRow` in the file tree, `SearchRow` in the search results and `ChangeRow`
in source control. All three follow the same shape, which is now load-bearing
rather than incidental:

```tsx
<TreeRowProvider value={{ row, selected, onActivate, onExpandKey }}>
  <TreeRow>
    <TreeRow.Indent />
    <TreeRow.Chevron />
    <TreeRow.Icon />
    <TreeRow.Label />
    <TreeRow.GitStatus />
    <TreeRow.Status />
  </TreeRow>
</TreeRowProvider>
```

Each part calls `useTreeRow()` - and each `SearchRow` part calls
`useSearchRow()`. Reordering or replacing a part needs no prop changes
anywhere. `TreeRow.GitStatus` is what adding a part looks like: a new member on
the compound, never a change to an existing one, so a row without git renders
precisely as it did before.

## Icons

`lucide-react` supplies every icon, imported one at a time so only what is used
is bundled. Icons take `size` and `strokeWidth` and inherit `currentColor`, so
they are coloured by the same Tailwind tokens as the text beside them - never
by a `color` prop. The file tree's row glyphs are the exception and stay
Unicode characters: they sit in a monospace column where a drawn icon would not
align.

## Colours

`apps/ui/src/theme/tokens.ts` is the only file in the app that contains a
colour value. Tailwind reads it, so every class is a named token
(`bg-surface`, `text-textMuted`, `ring-accentStrong`). The xterm theme
(`theme/terminalTheme.ts`) and the CodeMirror theme (`theme/editorTheme.ts`)
take colours as JavaScript strings and read the same object by name. A new
colour is added as a named token first.
