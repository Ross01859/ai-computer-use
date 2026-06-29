# Coding Task: Upgrade Vercel AI SDK Computer Use Demo into AI Agent Dashboard

## Project Context

We are starting from the existing Vercel demo:

https://github.com/vercel-labs/ai-sdk-computer-use

The current project already includes:

* Next.js app
* AI SDK chat
* Claude computer-use tools
* Vercel Sandbox
* VNC iframe/viewer
* Basic resizable layout
* Basic message rendering

Your task is to refactor and extend this demo into a production-quality AI Agent Dashboard.

Do not rewrite the project from scratch. Extend the current codebase.

---

# Main Goal

Build a two-panel AI Agent Dashboard similar to OpenAI Operator / Claude Computer Use.

The final app must include:

1. Left panel:

   * Chat
   * Inline tool call visualization
   * Collapsible debug panel

2. Right panel:

   * VNC viewer
   * Expanded current tool call details

3. Horizontally resizable panels

4. Typed event pipeline for all tool calls

5. Multiple chat sessions with localStorage persistence

6. Strong TypeScript types:

   * No `any`
   * Use discriminated unions

7. Ensure VNC viewer does not re-render when chat messages update

---

# Required Implementation Plan

## 1. Refactor Dashboard Structure

Create a clear dashboard component structure.

Recommended files:

```txt
components/dashboard/
  DashboardShell.tsx
  SessionSidebar.tsx
  ChatPanel.tsx
  MessageList.tsx
  MessageInput.tsx
  DebugPanel.tsx
  DesktopPanel.tsx
  VNCViewer.tsx
  ToolDetailPanel.tsx
  ToolEventCard.tsx
```

`app/page.tsx` should become thin and mainly render `DashboardShell`.

Avoid keeping all logic inside `app/page.tsx`.

---

## 2. Add Typed Tool Event System

Create:

```txt
types/tool-event.ts
```

Define strict discriminated union types.

Example shape:

```ts
export type ToolEventStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted";

export type ToolEventBase<TType extends string, TPayload> = {
  id: string;
  timestamp: number;
  type: TType;
  payload: TPayload;
  status: ToolEventStatus;
  duration?: number;
  result?: string;
  error?: string;
};

export type ClickToolEvent = ToolEventBase<
  "click",
  {
    x?: number;
    y?: number;
    button?: "left" | "right" | "middle";
  }
>;

export type TypeToolEvent = ToolEventBase<
  "type",
  {
    text: string;
  }
>;

export type ScrollToolEvent = ToolEventBase<
  "scroll",
  {
    x?: number;
    y?: number;
    deltaX?: number;
    deltaY?: number;
  }
>;

export type ScreenshotToolEvent = ToolEventBase<
  "screenshot",
  Record<string, never>
>;

export type WaitToolEvent = ToolEventBase<
  "wait",
  {
    durationMs?: number;
  }
>;

export type NavigateToolEvent = ToolEventBase<
  "navigate",
  {
    url: string;
  }
>;

export type BashToolEvent = ToolEventBase<
  "bash",
  {
    command: string;
  }
>;

export type ToolEvent =
  | ClickToolEvent
  | TypeToolEvent
  | ScrollToolEvent
  | ScreenshotToolEvent
  | WaitToolEvent
  | NavigateToolEvent
  | BashToolEvent;
```

Important:

* Do not use `any`.
* If an unknown payload is unavoidable, use `unknown` and narrow it safely.
* Prefer specific payload types.

---

## 3. Add Zustand Stores

Install Zustand if not already present:

```bash
pnpm add zustand
```

Create:

```txt
stores/event-store.ts
stores/session-store.ts
stores/ui-store.ts
```

---

## 4. Event Store Requirements

Create an event store that captures all tool calls.

The store should support:

```ts
addEvent(event: ToolEvent): void;
updateEvent(id: string, patch: Partial<ToolEvent>): void;
clearEvents(): void;
```

Also expose derived selectors:

* latestEvent
* runningEvents
* eventCountsByType
* agentStatus
* totalEvents
* failedEvents

Agent status should be derived from events:

```ts
export type AgentStatus =
  | "idle"
  | "running"
  | "waiting"
  | "finished"
  | "error";
```

Example logic:

* If any event has status `"running"` → `"running"`
* If latest event is `"error"` → `"error"`
* If events exist and none running → `"finished"`
* Otherwise → `"idle"`

Do not manually maintain duplicated counts if they can be derived from events.

---

## 5. Extract Tool Calls from AI SDK Messages

Current tool calls are likely rendered from `message.parts`.

Add a utility:

```txt
lib/tool-events/extract-tool-events.ts
```

It should convert AI SDK message parts into `ToolEvent[]`.

Example function:

```ts
export function extractToolEventsFromMessages(messages: Message[]): ToolEvent[] {
  // inspect message.parts
  // normalize tool calls into ToolEvent objects
}
```

Requirements:

* Stable event ids
* Timestamp
* Tool type
* Payload
* Status
* Duration when available
* Result/error if available

Then sync extracted events into `event-store`.

Avoid duplicate events.

---

## 6. Inline Tool Call Visualization

Update message rendering so each tool call appears inline in the chat.

Create:

```txt
components/dashboard/ToolEventCard.tsx
```

Card should display:

* Tool type
* Status
* Duration
* Short payload preview
* Error if failed

Keep UI simple but professional.

---

## 7. Debug Panel

Create a collapsible Debug Panel in the left panel.

File:

```txt
components/dashboard/DebugPanel.tsx
```

It should show:

* Agent status
* Total event count
* Counts by tool/action type
* Latest event
* Raw event store JSON

Must be collapsible.

Use `<details>` / `<summary>` or existing UI components.

---

## 8. Tool Detail Panel

Create:

```txt
components/dashboard/ToolDetailPanel.tsx
```

Place it under or beside the VNC viewer in the right panel.

It should show expanded details for the latest/current tool call:

* id
* timestamp
* type
* status
* duration
* payload JSON
* result/error

If there is no tool call, show an empty state.

---

## 9. Chat Sessions

Create:

```txt
types/session.ts
stores/session-store.ts
components/dashboard/SessionSidebar.tsx
```

Session type:

```ts
export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  events: ToolEvent[];
};
```

Session store should support:

```ts
createSession(): string;
switchSession(id: string): void;
deleteSession(id: string): void;
updateCurrentSessionMessages(messages: Message[]): void;
updateCurrentSessionEvents(events: ToolEvent[]): void;
```

Persist sessions to localStorage.

Use a safe storage key:

```ts
const STORAGE_KEY = "cambio-ai-agent-dashboard-sessions";
```

Requirements:

* Create new session
* Switch session
* Delete session
* Persist messages and events
* Restore sessions after refresh
* Ensure there is always at least one session

---

## 10. VNC Viewer Performance Requirement

This is critical.

The VNC viewer must not re-render when chat messages update.

Implement:

```tsx
export const VNCViewer = memo(function VNCViewer(props: VNCViewerProps) {
  return <iframe ... />;
});
```

Rules:

* `VNCViewer` must only receive stable props such as `streamUrl`.
* Do not pass messages, events, or chat status into `VNCViewer`.
* Move chat logic into `ChatPanel`.
* Move desktop logic into `DesktopPanel`.
* Use Zustand selectors to prevent unrelated re-renders.
* Use `useMemo` / `useCallback` where needed.

Add a temporary dev-only render counter inside `VNCViewer` to verify it does not re-render on chat updates. Remove or hide it before final polish if necessary.

---

## 11. Layout

Use existing resizable panel implementation if already available.

Final layout:

```txt
-------------------------------------------------
| Session Sidebar | Chat Panel | Desktop Panel   |
|                 |            |                 |
|                 | messages   | VNC Viewer      |
|                 |            |                 |
|                 | debug      | Tool Details    |
-------------------------------------------------
```

Minimum requirements:

* Left chat panel
* Right desktop panel
* Horizontal resizing
* Sidebar for sessions

Responsive bonus:

* On mobile, stack panels vertically or allow toggling between Chat and Desktop.

---

## 12. README

Rewrite README.

First line must be:

```txt
Author: [Your Full Name]
```

Add sections:

```txt
# AI Agent Dashboard

## Overview

## Features

## Architecture

## Event Pipeline

## Session Persistence

## VNC Performance Optimization

## TypeScript Design

## Running Locally

## Environment Variables

## Deployment

## Security Notes

## Future Improvements
```

Mention:

* Built on Vercel AI SDK Computer Use Demo
* Event pipeline design
* Zustand stores
* localStorage session persistence
* VNC viewer memoization
* No `any`
* Discriminated unions

---

# Acceptance Checklist

Before finishing, verify:

* [ ] App runs locally
* [ ] Two-panel dashboard exists
* [ ] Panels are horizontally resizable
* [ ] Left panel has chat
* [ ] Left panel has inline tool call visualization
* [ ] Left panel has collapsible debug panel
* [ ] Right panel has VNC viewer
* [ ] Right panel has current tool call detail panel
* [ ] All tool calls are captured as typed events
* [ ] Events include id, timestamp, type, payload, status, duration
* [ ] Derived state includes counts by action type
* [ ] Derived state includes agent status
* [ ] Multiple chat sessions work
* [ ] Create session works
* [ ] Switch session works
* [ ] Delete session works
* [ ] Sessions persist to localStorage
* [ ] No `any`
* [ ] Tool events use discriminated unions
* [ ] VNC viewer does not re-render on chat updates
* [ ] README first line is `Author: [Your Full Name]`
* [ ] README explains architecture clearly

---

# Priority Order

Implement in this exact order:

1. Refactor `app/page.tsx` into dashboard components
2. Memoize and isolate `VNCViewer`
3. Add typed `ToolEvent` definitions
4. Add `event-store`
5. Extract tool calls into event pipeline
6. Add inline `ToolEventCard`
7. Add `DebugPanel`
8. Add `ToolDetailPanel`
9. Add session store + localStorage
10. Add `SessionSidebar`
11. Polish responsive layout
12. Rewrite README

---

# Important Constraints

* Do not remove the existing computer-use functionality.
* Do not break VNC.
* Do not use `any`.
* Do not put all state into one large component.
* Do not make VNC depend on chat messages.
* Keep implementation practical and production-oriented.
* Prefer simple, maintainable UI over over-engineered visuals.

---

# Final Expected Result

The project should look and behave like a small production AI Agent Dashboard:

* User can chat with the agent
* Agent tool calls are visible inline
* VNC desktop shows the agent working
* Current tool call details are visible
* Debug panel shows event store and metrics
* User can create/switch/delete chat sessions
* Sessions persist after refresh
* Codebase has clear architecture and strong TypeScript types
* README explains the technical decisions
