# Site module

> The marketing site at `apps/site`. Next.js 16 App Router, React 19,
> Tailwind v4 and shadcn/ui, deployed to Vercel. One page, five bands, no
> client-side JavaScript of its own.

It lives in this repository rather than beside it for one reason: everything
it claims is checked in here. The version on the download button, the colours,
the transports table with its unbuilt third row, the security posture - all of
it goes stale the moment the site is a repository somebody has to remember to
update. Here, the colours cannot go stale at all, because they are generated.

## Shape

```
apps/site/
  components.json                the shadcn/ui registry config
  next.config.ts                 outputFileTracingRoot, and nothing else
  postcss.config.mjs             Tailwind v4 is the only plugin
  public/favicon.svg             copied from apps/ui/public
  src/
    app/
      layout.tsx                 metadata, the two fonts, header and footer
      page.tsx                   the five bands, and the one release lookup
      globals.css                shadcn's role names -> the product's tokens
    components/
      site/                      the bands, all presentational
      ui/                        shadcn/ui, added by its CLI
    content/                     every word a visitor reads
    lib/
      release.ts                 the version on the download button
      utils.ts                   `cn`, where shadcn expects to find it
    styles/
      tokens.generated.css       GENERATED - do not edit
```

## Colours are generated, not written twice

The rule in `CLAUDE.md` says `apps/ui/src/theme/tokens.ts` is the only file in
the repository allowed to hold a raw colour value, and that rule holds here
too. It has to cross one gap to do it: Tailwind v4 reads its theme from CSS at
build time, and CSS cannot import a `.ts` file.

So the same thing is done with colours that is done with the domain types -
generate, check the output in, never hand-edit:

```
npm run gen:theme       # tokens.ts -> apps/site/src/styles/tokens.generated.css
```

`predev` and `prebuild` in `apps/site/package.json` both run it, so a
forgotten regeneration is not a failure mode. Names are kebab-cased on the way
out: `surfaceRaised` becomes `--color-surface-raised`, so the class is
`bg-surface-raised`. The UI's own classes stay camelCase because Tailwind v3
takes its theme from the JavaScript object's keys directly.

### shadcn/ui's role names

shadcn components are written against roles - `bg-background`,
`text-muted-foreground` - rather than against a palette. `globals.css` is the
mapping, and it holds **references only**. There is not a colour value in that
file and there must never be one.

One role is deliberately absent from the mapping. shadcn means "the subtle
wash under a hovered menu item" by `accent`; this product means "teal, the one
colour that is not grey". The token wins the name, and the three places a
shadcn component wanted a hover wash were changed to `bg-surface-hover` by
hand. That is the expected relationship with shadcn - the components are
copied into the repository to be owned, not vendored to be left alone.

### Adding a component

```
cd apps/site
npx shadcn@latest add <name>
```

It reads `components.json`, writes into `src/components/ui/`, and does not
touch `globals.css`. Check the result for `bg-accent`.

## The release lookup

`lib/release.ts` asks the GitHub API for the latest release so the download
button can carry a version and link straight at the `.exe`. It is written to
survive being refused: unauthenticated requests are rate-limited per IP and a
build machine shares its IP generously, so there is a four-second timeout, an
hour of caching, and a fallback that is the releases page itself.

The button works whether or not that call does. The version label is the only
thing at stake, and a missing label is not a broken page. The call happens
once, in `page.tsx`, and is passed to both buttons so the two cannot disagree.

## Deploying to Vercel

One project, pointed at a subdirectory of this repository.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | `apps/site` |
| Include files outside the root directory | **on** |
| Install command | default (`npm install` at the repository root) |
| Build command | default (`npm run build`) |
| Node version | 20.x or newer |

"Include files outside the root directory" is not optional. The site is an npm
workspace member, its dependencies are installed from the root lockfile, and
`prebuild` reads `apps/ui/src/theme/tokens.ts` - two directories above the
project root.

The root `prepare` script runs `scripts/install-hooks.mjs`, which already
refuses to install git hooks when `CI` is set, so it is a no-op on the runner.
The lockfile carries every platform's optional binaries - `@next/swc-*`,
`@tailwindcss/oxide-*`, `lightningcss-*` - so a lockfile committed from
Windows installs correctly on Vercel's Linux builders.

Set `NEXT_PUBLIC_SITE_URL` to the real domain once there is one. It is only
used for `metadataBase`, so Open Graph and canonical URLs are absolute; the
fallback is the `.vercel.app` address.

## The release workflow does not fire for it

`.github/workflows/release-windows.yml` ships a Windows build on every push to
`main`. The site is in the same repository and is not in that installer, so
the workflow's `paths-ignore` covers `apps/site/**`, `docs/**`, `plan/**` and
every `.md`. Without it, fixing a typo on the landing page would bump the
app's version, rebuild the `.exe` and publish a release containing no change.

A push only skips when *every* file it touched matches, so a merge that moves
both the site and the app still releases.

There is no CI job for the site. Vercel builds every push and every pull
request, and a build that fails is reported on the pull request - a second
runner doing the same work would only be a slower way to hear it.

## What must never happen

- **A colour value in `apps/site`.** It belongs in `tokens.ts`, which is what
  the header of that file has always said. `globals.css` holds references and
  the backdrop in `Hero.tsx` reaches for `var(--color-*)` for the same reason.
- **`tokens.generated.css` edited by hand.** The next `npm run dev` overwrites
  it, silently and completely.
- **A credential, an analytics key or a token in this app.** The site is
  static and anonymous; there is nothing here to authenticate.
- **Copy written inside a component.** Everything a visitor reads lives in
  `src/content/`, so this app's English-only strings sit in one folder rather
  than in fifteen files - the same reason the panes have a `messages.ts`.
- **A claim the repository does not back.** The transports table names the
  remote agent as not built, because it is not built.
