# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 15 App Router TypeScript app. The main UI lives in `app/page.tsx`, API routes live under `app/api/`, and global Tailwind styles are in `app/globals.css`. Reusable React components are in `components/`; shadcn-style primitives are in `components/ui/`. Shared utilities and hooks are in `lib/`, with Vercel Sandbox integration in `lib/sandbox/`, including computer-use tools and the snapshot creation script. Static app assets currently live in `app/`, such as `app/favicon.ico`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies from `pnpm-lock.yaml`.
- `pnpm dev`: start the local Next.js development server at `http://localhost:3000`.
- `pnpm build`: create a production build and surface TypeScript or Next.js build errors.
- `pnpm start`: serve the production build after `pnpm build`.
- `pnpm lint`: run the configured Next.js ESLint checks.
- `npx tsx lib/sandbox/create-snapshot.ts`: create the Vercel Sandbox snapshot used by the desktop environment.

Local sandbox work requires `.env.local` values such as `ANTHROPIC_API_KEY`, `SANDBOX_SNAPSHOT_ID`, and either `VERCEL_OIDC_TOKEN` or the Vercel token/team/project variables described in `README.md`.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Follow the existing 2-space indentation, double quotes, and semicolon style. Name React components in PascalCase, hooks with `use...`, and multiword files in kebab case, for example `project-info.tsx` and `use-scroll-to-bottom.tsx`. Prefer the `@/` path alias over long relative imports. Use Tailwind utility classes and existing shadcn/ui primitives before adding custom component patterns.

## Testing Guidelines

No dedicated test runner is currently configured. Treat `pnpm lint` and `pnpm build` as the required verification steps before submitting changes. If tests are added, keep them near the feature or in a clearly named test directory, use descriptive names, and document the new command in `package.json` and this guide.

## Commit & Pull Request Guidelines

Recent history uses short, direct commit subjects such as `format`, `update`, and `basic working implementation`, plus merge commits from pull requests. Keep new commit subjects concise and imperative when possible, and group unrelated changes separately. Pull requests should describe the behavior change, list verification commands run, link relevant issues, and include screenshots or screen recordings for visible UI changes.

## Security & Configuration Tips

Do not commit `.env.local`, API keys, Vercel tokens, or generated sandbox credentials. Keep sandbox lifecycle changes conservative: verify cleanup paths such as `app/api/kill-desktop/route.ts` when changing desktop initialization or error handling.
