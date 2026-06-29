Author: [Your Full Name]

# AI Agent Dashboard

## Overview

AI Agent Dashboard is a Next.js App Router application built on the Vercel AI SDK Computer Use Demo. It provides a production-oriented interface for chatting with a Claude computer-use agent while watching its Vercel Sandbox desktop through noVNC.

## Features

- Streaming chat powered by the AI SDK and Anthropic Claude.
- Remote desktop execution through Vercel Sandbox.
- Memoized VNC viewer isolated from chat message updates.
- Inline tool-call cards for computer and bash actions.
- Collapsible debug panel with event metrics and raw JSON.
- Current or selected tool-call details beside the desktop.
- Multiple chat sessions persisted in `localStorage`.

## Architecture

The app is organized around a dashboard shell with three areas: session sidebar, chat panel, and desktop panel. Chat logic lives in the chat panel, desktop lifecycle logic lives in the desktop panel, and the VNC iframe is isolated in a memoized viewer component.

```txt
User -> Chat Panel -> AI SDK -> Claude Sonnet
                              -> Vercel Sandbox -> noVNC iframe
```

## Event Pipeline

AI SDK `message.parts` are normalized into typed `ToolEvent` records. Events use discriminated unions, stable IDs, timestamps, status, payload, duration, and result or error summaries. Screenshot image data is kept in chat messages only and is not copied into the event store.

## Session Persistence

Sessions are managed with Zustand and persisted under the `cambio-ai-agent-dashboard-sessions` storage key. Each session stores its title, timestamps, messages, and tool events. Runtime desktop state such as `sandboxId` and `streamUrl` is not persisted.

## VNC Performance Optimization

`VNCViewer` is wrapped in `memo` and only receives `streamUrl`. Chat messages, tool events, debug state, and session metadata do not flow into the iframe component, so normal chat updates do not remount the remote desktop view.

## TypeScript Design

The code uses strict TypeScript types, discriminated unions for tool events, and Zustand selectors for focused state reads. Project code should not use `any`; unknown tool payloads must be narrowed before use.

## Running Locally

Install dependencies:

```bash
pnpm install
```

Create a Vercel Sandbox snapshot:

```bash
npx tsx lib/sandbox/create-snapshot.ts
```

Add the generated snapshot ID and API credentials to `.env.local`, then start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

Run the verification checks:

```bash
pnpm test
pnpm lint
pnpm build
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key used by Claude. |
| `SANDBOX_SNAPSHOT_ID` | Yes | Vercel Sandbox snapshot with desktop tooling. |
| `VERCEL_OIDC_TOKEN` | Yes* | Usually populated by `vercel env pull`. |
| `VERCEL_TOKEN` | Alt* | Personal access token alternative to OIDC. |
| `VERCEL_TEAM_ID` | Alt* | Required with `VERCEL_TOKEN`. |
| `VERCEL_PROJECT_ID` | Alt* | Required with `VERCEL_TOKEN`. |

Either `VERCEL_OIDC_TOKEN` or the token/team/project set is required for Sandbox authentication.

## Deployment

Deploy to Vercel after creating and configuring `SANDBOX_SNAPSHOT_ID`. Ensure all environment variables are set in the deployment environment before exposing the dashboard.

## Security Notes

Do not commit `.env.local`, API keys, Vercel tokens, or generated sandbox credentials. Treat noVNC URLs as sensitive because they expose the remote desktop stream. Add authentication and rate limiting before deploying publicly, since chat requests can create sandboxes and consume Anthropic/Vercel quota.

## Future Improvements

- Add authenticated access control.
- Add request and sandbox quota limits.
- Add automated tests for event extraction and session persistence.
- Add richer mobile desktop controls.
