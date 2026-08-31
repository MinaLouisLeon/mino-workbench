import { Section } from "@/components/site/Section";
import { Transports } from "@/components/site/Transports";
import { rule } from "@/content/meta";

/**
 * The architecture band.
 *
 * The rule is quoted rather than paraphrased, and it sits above the table of
 * implementations because the table is the evidence for it: three shapes, one
 * interface, and one of them openly not built yet.
 */
export function TheRule() {
  return (
    <Section
      id="architecture"
      eyebrow={rule.eyebrow}
      heading={
        <span className="font-mono text-2xl leading-snug sm:text-3xl">
          &ldquo;{rule.quote}&rdquo;
        </span>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="space-y-5">
          {rule.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 24)}
              className="text-base leading-relaxed text-text-muted"
            >
              {paragraph}
            </p>
          ))}
        </div>
        <Transports />
      </div>
    </Section>
  );
}
