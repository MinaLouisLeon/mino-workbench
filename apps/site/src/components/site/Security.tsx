import { ShieldCheck } from "lucide-react";

import { Section } from "@/components/site/Section";
import { guarantees } from "@/content/security";

/**
 * The security band.
 *
 * Six guarantees, each one a thing the code enforces rather than a thing the
 * team intends. The heading says "cannot" on purpose: every item here is
 * refused at a boundary, not checked for in a review.
 */
export function Security() {
  return (
    <Section
      id="security"
      eyebrow="Security posture"
      heading="What this application cannot do."
      lead="A workbench reaches your filesystem, your shell and your remotes. These are the boundaries it refuses to cross, and the reasons each one is a boundary rather than a habit."
    >
      <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {guarantees.map((guarantee) => (
          <div key={guarantee.title} className="flex gap-4">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-accent"
              aria-hidden
            />
            <div>
              <h3 className="text-sm font-semibold">{guarantee.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {guarantee.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
