import { Section } from "@/components/site/Section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { features } from "@/content/features";

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="What it does"
      heading="Three panes, and the things a workbench needs behind them."
      lead="Local and SSH sessions both work end to end, git and GitHub included. Everything below is built and shipping, not planned."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="gap-4 border-border bg-surface-raised transition-colors hover:border-border-strong"
          >
            <CardHeader className="gap-3">
              <feature.icon className="size-5 text-accent" aria-hidden />
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-text">{feature.body}</p>
              <p className="text-sm leading-relaxed text-text-faint">
                {feature.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
