import { Download, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/site/Section";
import { Separator } from "@/components/ui/separator";
import { install, repo } from "@/content/meta";
import type { Release } from "@/lib/release";

type InstallProps = {
  release: Release;
};

export function Install({ release }: InstallProps) {
  return (
    <Section
      id="install"
      eyebrow={install.eyebrow}
      heading={install.heading}
      lead={install.body}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
        <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="font-mono text-xs text-text-faint">bash</span>
          </div>
          <pre className="overflow-x-auto px-4 py-4 font-mono text-sm leading-relaxed text-text-muted">
            <code>{install.snippet}</code>
          </pre>
        </div>

        <div>
          <p className="text-sm leading-relaxed text-text-muted">
            {install.aside}
          </p>
          <Separator className="my-6 bg-border" />
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button asChild>
              <a href={release.href} target="_blank" rel="noreferrer">
                <Download aria-hidden />
                Download{release.version ? ` ${release.version}` : ""}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={repo.docs} target="_blank" rel="noreferrer">
                <Github aria-hidden />
                Read the docs
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
