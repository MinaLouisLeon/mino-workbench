import { SidebarProvider } from "@/features/sidebar/context/SidebarContext";

import { WorkbenchPanes } from "./WorkbenchPanes";

/**
 * The workbench: the sidebar's state, wrapped around the panes that read it.
 *
 * The provider is here rather than in `App` because the sidebar has nothing to
 * say while the start screen is up - there is no folder to browse or search -
 * and scoping it to the workbench means it is created when a session opens and
 * gone when one closes.
 */
export function Workbench() {
  return (
    <SidebarProvider>
      <WorkbenchPanes />
    </SidebarProvider>
  );
}
