import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { FileTreePane } from "@/features/file-tree/components/FileTreePane";
import { TerminalPane } from "@/features/terminal/components/TerminalPane";
import { ViewerPane } from "@/features/viewer/components/ViewerPane";

import { useWorkbenchLayout } from "../hooks/useWorkbenchLayout";
import { WorkbenchHeader } from "./WorkbenchHeader";

const HANDLE_CLASSES =
  "bg-border transition-colors hover:bg-accentMuted data-[resize-handle-active]:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accentStrong";

/** The three panes. Split sizes persist across launches. */
export function Workbench() {
  const { sizes, onColumnsLayout, onRightLayout } = useWorkbenchLayout();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkbenchHeader />
      <PanelGroup
        direction="horizontal"
        onLayout={onColumnsLayout}
        className="min-h-0 flex-1"
      >
        <Panel defaultSize={sizes.tree} minSize={14} order={1}>
          <FileTreePane />
        </Panel>
        <PanelResizeHandle className={`w-1 ${HANDLE_CLASSES}`} />
        <Panel defaultSize={100 - sizes.tree} minSize={30} order={2}>
          <PanelGroup direction="vertical" onLayout={onRightLayout}>
            <Panel defaultSize={sizes.viewer} minSize={20} order={1}>
              <ViewerPane />
            </Panel>
            <PanelResizeHandle className={`h-1 ${HANDLE_CLASSES}`} />
            <Panel defaultSize={sizes.terminal} minSize={15} order={2}>
              <TerminalPane />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
