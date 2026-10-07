import { Features } from "@/components/site/Features";
import { Hero } from "@/components/site/Hero";
import { Install } from "@/components/site/Install";
import { Security } from "@/components/site/Security";
import { TheRule } from "@/components/site/TheRule";
import { latestRelease } from "@/lib/release";

/**
 * One page, five bands.
 *
 * The release lookup happens here and is passed down, so the two download
 * buttons on the page cannot disagree about which version they offer.
 */
export default async function HomePage() {
  const release = await latestRelease();

  return (
    <main>
      <Hero release={release} />
      <Features />
      <TheRule />
      <Security />
      <Install release={release} />
    </main>
  );
}
