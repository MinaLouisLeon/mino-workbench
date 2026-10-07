import type { GitHubIssue, GitHubPullRequest } from "@/Types";
import { useContextMenu } from "@/hooks/useContextMenu";
import { copyText } from "@/lib/clipboard";
import { action, separator } from "@/lib/menu";
import { MENU_COPY } from "@/lib/menuCopy";
import { openExternal } from "@/lib/openExternal";

import { useGitHubContext } from "../context/GitHubContext";
import { GITHUB_MENU_COPY, REVIEW_COPY } from "../messages";

/**
 * Right-click menus for pull requests and issues.
 *
 * "Open on GitHub" goes through `openExternal`, like the row's own link
 * button, so the URL is checked and handed to the system browser - never
 * navigated to by this window. "Copy Link" puts the URL on the clipboard as
 * text; nothing here renders it.
 */
export function usePullRequestMenu(
  pull: GitHubPullRequest,
  selected: boolean,
  onSelect: (number: number) => void,
) {
  const { reviewing, review } = useGitHubContext();
  return useContextMenu(() => {
    const isReviewing = reviewing === pull.number;
    return [
      action("detail", selected ? GITHUB_MENU_COPY.hideDetail : GITHUB_MENU_COPY.showDetail, () =>
        onSelect(pull.number),
      ),
      action("review", isReviewing ? REVIEW_COPY.stop : REVIEW_COPY.start, () =>
        review(isReviewing ? null : pull.number),
      ),
      separator(),
      ...linkEntries(pull.url),
    ];
  });
}

/**
 * The issue list draws its rows in a loop, so one handler serves them all and
 * finds the issue by the `data-number` its row carries.
 */
export function useIssueMenu(issues: readonly GitHubIssue[]) {
  return useContextMenu((event) => {
    const number = Number(event.currentTarget.dataset.number);
    const issue = issues.find((candidate) => candidate.number === number);
    return issue ? linkEntries(issue.url) : [];
  });
}

function linkEntries(url: string) {
  return [
    action("open-github", MENU_COPY.openOnGitHub, () => void openExternal(url).catch(() => undefined)),
    action("copy-link", MENU_COPY.copyLink, () => void copyText(url)),
  ];
}
