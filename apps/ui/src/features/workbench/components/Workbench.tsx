import { GitStatusProvider } from "@/features/git/context/GitStatusContext";
import { SidebarProvider } from "@/features/sidebar/context/SidebarContext";

import { WorkbenchPanes } from "./WorkbenchPanes";

/**
 * The workbench: the sidebar's and git's state, wrapped around the panes that
 * read them.
 *
 * Both providers are here rather than in `App` because neither has anything to
 * say while the start screen is up - there is no folder to browse, search or
 * read a working tree from - and scoping them to the workbench means they are
 * created when a session opens and gone when one closes.
 *
 * Git wraps the sidebar because both the header and the tree read it: one
 * `git status` for the whole window, not one per pane.
 */
export function Workbench() {
  return (
    <GitStatusProvider>
      <SidebarProvider>
        <WorkbenchPanes />
      </SidebarProvider>
    </GitStatusProvider>
  );
}
