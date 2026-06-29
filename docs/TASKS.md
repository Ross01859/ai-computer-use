# AI Agent Dashboard Task Breakdown

本文档基于 `docs/IMPLEMENTATION_PLAN.md` 拆解，用于把当前 Vercel AI SDK Computer Use Demo 改造成生产质量的 AI Agent Dashboard。实现时必须扩展当前代码库，不要从零重写。

## 目标与交付物

- 最终页面是一个 AI Agent Dashboard，包含会话侧边栏、聊天面板、VNC 桌面面板、内联工具调用卡片、调试面板和当前工具详情面板。
- 保留现有 Claude computer-use、bash tool、Vercel Sandbox、noVNC iframe 和聊天流式响应能力。
- 增加强类型 Tool Event Pipeline，所有工具调用都能被抽取、持久化、展示和统计。
- 支持多个聊天会话，并通过 `localStorage` 持久化会话消息和事件。
- VNC iframe 必须与聊天消息更新隔离，聊天更新不能触发 VNC Viewer 重新渲染。
- README 需要按新产品形态重写，第一行必须是 `Author: [Your Full Name]`。

## 执行顺序

必须按以下顺序实施，避免先做状态持久化或 UI 细节导致架构返工。

1. 重构 `app/page.tsx` 到 dashboard 组件结构。
2. 隔离并 memoize `VNCViewer`。
3. 添加 `ToolEvent` 强类型定义。
4. 添加 Zustand stores。
5. 实现从 AI SDK messages 到 Tool Events 的抽取管线。
6. 添加内联 `ToolEventCard`。
7. 添加 `DebugPanel`。
8. 添加 `ToolDetailPanel`。
9. 添加 chat sessions 和 `localStorage` 持久化。
10. 添加 `SessionSidebar`。
11. 优化响应式布局。
12. 重写 README。

## 全局工程约束

- 不要删除或弱化现有 computer-use 功能。
- 不要破坏 VNC 初始化、刷新、显示和页面关闭时的 sandbox 清理逻辑。
- TypeScript 禁止使用 `any`。不可避免的未知输入使用 `unknown`，并在使用前安全收窄。
- 使用 discriminated unions 表达工具事件，不要用松散字符串对象替代。
- 不要把所有状态塞回 `app/page.tsx` 或单个大组件。
- `VNCViewer` 不得接收 `messages`、`events`、chat status 或任何与聊天流相关的 props。
- UI 优先简单、清晰、可维护，不做过度装饰。
- 新增依赖仅允许 `zustand`，除非实现中发现确实无法满足需求。

## Phase 1: Dashboard 结构重构

### 目标

把当前集中在 `app/page.tsx` 的页面逻辑拆分为清晰的 dashboard 组件，为后续事件管线和会话持久化留出边界。

### 涉及文件

- `app/page.tsx`
- `components/dashboard/DashboardShell.tsx`
- `components/dashboard/ChatPanel.tsx`
- `components/dashboard/MessageList.tsx`
- `components/dashboard/MessageInput.tsx`
- `components/dashboard/DesktopPanel.tsx`
- `components/dashboard/VNCViewer.tsx`
- `components/dashboard/DebugPanel.tsx`
- `components/dashboard/ToolDetailPanel.tsx`
- `components/dashboard/ToolEventCard.tsx`
- `components/dashboard/SessionSidebar.tsx`

### 任务清单

- [ ] 创建 `components/dashboard/` 目录。
- [ ] 将 `app/page.tsx` 改为 thin entry，只渲染 `DashboardShell`。
- [ ] 创建 `DashboardShell` 作为页面布局容器，负责组合 sidebar、chat panel、desktop panel 和 resizable panels。
- [ ] 创建 `ChatPanel`，承载 `useChat`、消息列表、输入框、prompt suggestions、stop generation 等聊天行为。
- [ ] 创建 `MessageList`，只负责渲染消息流和自动滚动锚点。
- [ ] 创建 `MessageInput`，从现有 `components/input.tsx` 迁移或复用输入交互。
- [ ] 创建 `DesktopPanel`，承载 sandbox desktop 初始化、刷新、关闭清理、loading 状态和 VNC 区域。
- [ ] 暂时创建 `DebugPanel`、`ToolDetailPanel`、`ToolEventCard`、`SessionSidebar` 的最小占位组件，后续 Phase 再补完整功能。
- [ ] 保留现有 desktop 初始化失败 toast、chat error toast、stop 时标记 aborted tool invocation 的行为。
- [ ] 保留桌面端水平布局和移动端 chat-only 的基础行为，后续 Phase 11 再做响应式增强。

### 验收标准

- [ ] `app/page.tsx` 不再包含大段 chat、VNC 和 sandbox 业务逻辑。
- [ ] 原有聊天、VNC iframe、刷新 desktop、页面关闭清理 sandbox 的行为仍可工作。
- [ ] 组件之间职责清晰，没有单个新组件重新膨胀为全部逻辑容器。

### 注意事项

- `sandboxId` 需要被 chat API body 使用，也需要被 desktop lifecycle 使用。重构初期可以由 `DashboardShell` 统一持有，Phase 4 后迁移到 `ui-store`。
- 不要在此阶段改变 API route、tool 行为或消息数据结构。

## Phase 2: VNC Viewer 隔离与性能优化

### 目标

确保 VNC iframe 不因聊天消息、工具事件或调试面板更新而重新渲染。

### 涉及文件

- `components/dashboard/VNCViewer.tsx`
- `components/dashboard/DesktopPanel.tsx`
- `components/dashboard/DashboardShell.tsx`

### 任务清单

- [ ] 实现 `VNCViewerProps`，仅包含稳定的 VNC 显示参数：`streamUrl: string`。
- [ ] 使用 `memo` 导出 `VNCViewer`。
- [ ] `VNCViewer` 内只渲染 iframe，不渲染刷新按钮、loading 文本或工具详情。
- [ ] 将 desktop loading、refresh button、error fallback 放在 `DesktopPanel` 中。
- [ ] 不向 `VNCViewer` 传入 `messages`、`events`、`status`、`sandboxId`、`isInitializing`。
- [ ] 如需验证渲染次数，使用 dev-only `useRef` + `console.debug`，不要在最终 UI 中显示调试计数。
- [ ] 确保 `streamUrl` 不变时，ChatPanel 输入、消息流式更新、DebugPanel 展开折叠都不触发 VNCViewer 重新渲染。

### 验收标准

- [ ] `VNCViewer` 是 memoized component。
- [ ] VNC iframe props 稳定且最小化。
- [ ] 手动发送聊天消息时，除非 `streamUrl` 改变，否则 VNC iframe 不重新 mount。

### 注意事项

- `onRefresh` 不要传给 `VNCViewer`，否则 callback identity 变化会增加重新渲染风险。
- `key` 不要绑定到会话、消息或事件，只能在确实需要重建 iframe 时绑定到 `streamUrl`。

## Phase 3: Typed Tool Event System

### 目标

建立严格的工具事件类型系统，覆盖当前 computer tool 和 bash tool 的所有调用。

### 涉及文件

- `types/tool-event.ts`

### 任务清单

- [ ] 创建 `types/` 目录。
- [ ] 创建 `types/tool-event.ts`。
- [ ] 定义 `ToolEventStatus = "pending" | "running" | "success" | "error" | "aborted"`。
- [ ] 定义 `ComputerToolAction`，至少覆盖当前代码中的动作：`screenshot`、`wait`、`left_click`、`double_click`、`right_click`、`mouse_move`、`type`、`key`、`scroll`、`left_click_drag`。
- [ ] 定义 `ToolEventType = ComputerToolAction | "bash" | "navigate"`，其中 `navigate` 保留给后续浏览器导航事件。
- [ ] 定义泛型 `ToolEventBase<TType, TPayload>`，包含 `id`、`timestamp`、`type`、`payload`、`status`、`duration?`、`result?`、`error?`。
- [ ] 为每类 payload 定义具体类型，不使用 `Record<string, unknown>` 代替已知字段。
- [ ] 定义 `ToolEvent` discriminated union。
- [ ] 定义 `AgentStatus = "idle" | "running" | "waiting" | "finished" | "error"`。

### 推荐类型要求

- click payload 包含 `x?: number`、`y?: number`、`button: "left" | "right"`、`clickCount?: 1 | 2`。
- mouse move payload 包含 `x: number`、`y: number`。
- drag payload 包含 `startX`、`startY`、`endX`、`endY`。
- type payload 包含 `text: string`。
- key payload 包含 `key: string`。
- scroll payload 包含 `direction: "up" | "down"`、`amount: number`。
- wait payload 包含 `durationMs?: number`。
- screenshot payload 使用 `Record<string, never>`。
- bash payload 包含 `command: string`。
- navigate payload 包含 `url: string`。

### 验收标准

- [ ] 全部事件类型可通过 `type` 字段安全收窄。
- [ ] 没有 `any`。
- [ ] 当前 computer tool 和 bash tool 的所有工具调用都有对应事件类型。

### 注意事项

- 不要只照搬原计划里的简化 union；需要覆盖当前仓库实际支持的 tool action。
- 如果 AI SDK tool args 类型不够精确，先使用 `unknown` 接收，再写 type guard 收窄。

## Phase 4: Zustand Stores

### 目标

添加独立的状态 store，避免跨组件 props drilling，并保证 VNC 不依赖聊天状态。

### 涉及文件

- `package.json`
- `pnpm-lock.yaml`
- `stores/event-store.ts`
- `stores/session-store.ts`
- `stores/ui-store.ts`

### 任务清单

- [ ] 如果项目尚未安装 Zustand，运行 `pnpm add zustand`。
- [ ] 创建 `stores/` 目录。
- [ ] 创建 `event-store.ts`，状态只包含事件列表和事件相关 actions。
- [ ] 创建 `session-store.ts`，状态只包含 sessions、currentSessionId 和 session actions。
- [ ] 创建 `ui-store.ts`，状态包含 UI 和 desktop 协调字段。
- [ ] 在 `ui-store` 中管理 `sandboxId`、`streamUrl`、`isDesktopInitializing`、`selectedEventId`、`isDebugOpen`、移动端当前视图等 UI 状态。
- [ ] 使用 Zustand selector 读取最小状态，避免 ChatPanel 更新影响 DesktopPanel 和 VNCViewer。

### Event Store 要求

- [ ] `addEvent(event: ToolEvent): void`
- [ ] `updateEvent(id: string, patch: Partial<ToolEvent>): void`
- [ ] `replaceEvents(events: ToolEvent[]): void`
- [ ] `clearEvents(): void`
- [ ] 导出 selector：`selectLatestEvent`
- [ ] 导出 selector：`selectRunningEvents`
- [ ] 导出 selector：`selectEventCountsByType`
- [ ] 导出 selector：`selectAgentStatus`
- [ ] 导出 selector：`selectTotalEvents`
- [ ] 导出 selector：`selectFailedEvents`

### Agent Status 规则

- 如果存在 `status === "running"` 的事件，返回 `"running"`。
- 如果最新事件 `status === "error"`，返回 `"error"`。
- 如果最新事件 `status === "pending"`，返回 `"waiting"`。
- 如果存在事件且没有 running/pending/error，返回 `"finished"`。
- 否则返回 `"idle"`。

### 验收标准

- [ ] 派生数据不重复写入 store，不维护 duplicated counts。
- [ ] 组件使用 selector 读取需要的状态。
- [ ] 新增 Zustand 后 lockfile 和 package manifest 保持一致。

### 注意事项

- `session-store` 的持久化在 Phase 9 完成，本阶段可以先定义 store shape。
- `ui-store` 不保存大体积消息数组或事件 JSON。

## Phase 5: Tool Event Extraction Pipeline

### 目标

从 AI SDK messages 中抽取 tool invocations，转换成稳定、去重、可持久化的 `ToolEvent[]`。

### 涉及文件

- `lib/tool-events/extract-tool-events.ts`
- `lib/tool-events/tool-event-guards.ts`
- `components/dashboard/ChatPanel.tsx`
- `stores/event-store.ts`
- `stores/session-store.ts`

### 任务清单

- [ ] 创建 `lib/tool-events/` 目录。
- [ ] 实现 `extractToolEventsFromMessages(messages): ToolEvent[]`。
- [ ] 遍历 message parts，识别 `part.type === "tool-invocation"`。
- [ ] 使用 `toolCallId` 作为事件稳定 id 的主要来源。
- [ ] 如果缺少 `toolCallId`，使用 `message.id + part index + toolName` 生成稳定 fallback id。
- [ ] 将 `computer` tool 的 `args.action` 映射到对应 `ToolEvent`。
- [ ] 将 `bash` tool 的 `args.command` 映射为 `BashToolEvent`。
- [ ] 根据 invocation state 推导状态：`call` 映射为 `running`，`result` 映射为 `success`，aborted result 映射为 `aborted`，错误映射为 `error`。
- [ ] 若 result 是文本，写入 `result` 字段；若 result 是图片，只写入简短描述，不把 base64 大图存入 event store。
- [ ] timestamp 使用可稳定复算的来源；如果 AI SDK message 没有 createdAt，则首次抽取时用当前时间，并通过 store 保留旧事件 timestamp，避免每次 render 改变。
- [ ] 在 `ChatPanel` 中监听 messages 变化，抽取 events 并同步到 `event-store`。
- [ ] 同步到 event-store 时按 id merge，避免重复事件。
- [ ] 同步当前 session events，供刷新后恢复。

### 验收标准

- [ ] 每个工具调用只生成一个稳定 event。
- [ ] 工具状态会随 AI SDK invocation state 更新。
- [ ] screenshot 不把 base64 数据写入 event store 或 localStorage。
- [ ] `DebugPanel` 和 `ToolDetailPanel` 能消费同一份事件数据。

### 注意事项

- 不要在 render 过程中直接写 store。使用 `useEffect` 根据 messages 变化同步。
- 如果需要保存 timestamp，优先复用已有 event 的 timestamp，再为新 event 创建 timestamp。

## Phase 6: Inline Tool Call Visualization

### 目标

在聊天消息中内联展示工具调用，让用户能看到 agent 正在执行什么。

### 涉及文件

- `components/dashboard/ToolEventCard.tsx`
- `components/dashboard/MessageList.tsx`
- `components/message.tsx`

### 任务清单

- [ ] 实现 `ToolEventCard`，props 至少包含 `event: ToolEvent`、`isSelected?: boolean`、`onSelect?: (id: string) => void`。
- [ ] 卡片展示 tool type、status、duration、payload preview。
- [ ] 错误事件展示 error 文本。
- [ ] bash 事件展示命令前 80 个字符。
- [ ] type 事件展示输入文本前 80 个字符。
- [ ] screenshot 事件展示 “Screenshot captured” 或运行中状态，不展示 base64。
- [ ] 点击卡片时设置 `ui-store.selectedEventId`。
- [ ] 将现有 `components/message.tsx` 中的 tool invocation 渲染逻辑迁移或替换为 `ToolEventCard`。
- [ ] 保留现有截图结果在聊天内预览的能力，图片只来自 AI SDK message result，不来自 event store。

### 验收标准

- [ ] 工具调用以内联卡片出现在聊天流中。
- [ ] running、success、error、aborted 有可区分的视觉状态。
- [ ] 点击工具卡片后右侧详情面板显示该事件。

### 注意事项

- 卡片 UI 使用现有 Tailwind、lucide icons 和 shadcn-style primitives。
- 不要引入新的复杂 UI 依赖。

## Phase 7: Debug Panel

### 目标

在左侧聊天区域提供可折叠调试信息，便于观察事件管线和 agent 状态。

### 涉及文件

- `components/dashboard/DebugPanel.tsx`
- `stores/event-store.ts`
- `stores/ui-store.ts`

### 任务清单

- [ ] 实现可折叠面板，优先使用 `<details>` / `<summary>`。
- [ ] 展示 agent status。
- [ ] 展示 total event count。
- [ ] 展示 failed event count。
- [ ] 展示 counts by event type。
- [ ] 展示 latest event 摘要。
- [ ] 展示 raw event store JSON，使用 `<pre>`，限制高度并允许滚动。
- [ ] 面板展开状态同步到 `ui-store.isDebugOpen`。

### 验收标准

- [ ] DebugPanel 默认不干扰聊天主流程。
- [ ] 展开后能看到完整事件 JSON。
- [ ] 数据来自 event-store selectors，而不是重新扫描 messages。

### 注意事项

- Raw JSON 中不要包含 screenshot base64。
- 大量事件时面板必须可滚动，不能撑破布局。

## Phase 8: Tool Detail Panel

### 目标

在右侧桌面区域展示当前或选中的工具事件详情。

### 涉及文件

- `components/dashboard/ToolDetailPanel.tsx`
- `stores/event-store.ts`
- `stores/ui-store.ts`

### 任务清单

- [ ] 读取 `selectedEventId`。
- [ ] 如果存在 selected event，展示 selected event。
- [ ] 如果没有 selected event，展示 latest event。
- [ ] 如果没有任何事件，展示简洁 empty state。
- [ ] 展示 id、timestamp、type、status、duration。
- [ ] 展示 payload JSON。
- [ ] 展示 result 或 error。
- [ ] 提供 clear selection 操作，恢复到 latest event。

### 验收标准

- [ ] 最新工具调用会自动出现在详情面板。
- [ ] 点击聊天内联工具卡片后，详情面板切换到该事件。
- [ ] payload/result/error 格式化清晰，不破坏右侧布局。

### 注意事项

- 时间显示使用本地可读格式即可，不需要引入日期库。
- 详情面板不能传递任何状态给 `VNCViewer`。

## Phase 9: Chat Sessions 与 localStorage 持久化

### 目标

支持多个聊天会话，刷新页面后恢复会话、消息和事件。

### 涉及文件

- `types/session.ts`
- `stores/session-store.ts`
- `components/dashboard/ChatPanel.tsx`
- `stores/event-store.ts`

### 任务清单

- [ ] 创建 `types/session.ts`。
- [ ] 定义 `ChatSession`，包含 `id`、`title`、`createdAt`、`updatedAt`、`messages`、`events`。
- [ ] 使用 storage key：`cambio-ai-agent-dashboard-sessions`。
- [ ] 在 `session-store` 中实现 `createSession(): string`。
- [ ] 实现 `switchSession(id: string): void`。
- [ ] 实现 `deleteSession(id: string): void`。
- [ ] 实现 `updateCurrentSessionMessages(messages): void`。
- [ ] 实现 `updateCurrentSessionEvents(events): void`。
- [ ] 实现刷新后恢复 sessions。
- [ ] 确保始终至少存在一个 session。
- [ ] 新 session 使用 `crypto.randomUUID()` 生成 id。
- [ ] session title 默认 `New Session`，收到第一条用户消息后改为该消息前 40 个字符。
- [ ] 切换 session 时，ChatPanel 使用对应 session messages 初始化或恢复 UI。
- [ ] 切换 session 时，event-store 替换为对应 session events。

### 推荐类型

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

### 验收标准

- [ ] 创建会话后可立即进入新会话。
- [ ] 切换会话后消息和事件都切换。
- [ ] 删除当前会话后自动选中另一个会话。
- [ ] 删除最后一个会话时自动创建一个空会话。
- [ ] 刷新页面后 sessions、当前 session、messages、events 能恢复。

### 注意事项

- 如果 AI SDK message 类型和 `Message` 类型不一致，定义项目级类型别名，保持全项目一致，禁止用 `any` 绕过。
- 不要把 streamUrl、sandboxId、isLoading 等运行时状态持久化到 session。

## Phase 10: Session Sidebar

### 目标

提供会话创建、切换、删除入口，并让 Dashboard 更像生产工具。

### 涉及文件

- `components/dashboard/SessionSidebar.tsx`
- `stores/session-store.ts`
- `stores/ui-store.ts`

### 任务清单

- [ ] 展示 session 列表。
- [ ] 当前 session 高亮。
- [ ] 展示 session title。
- [ ] 展示简短更新时间。
- [ ] 提供 New Session 按钮。
- [ ] 每个 session 提供删除按钮。
- [ ] 删除前使用轻量确认，至少使用 `window.confirm`。
- [ ] 点击 session 时切换当前会话。
- [ ] 移动端允许 sidebar 折叠或隐藏。

### 验收标准

- [ ] 用户可以创建、切换、删除会话。
- [ ] 当前 session 状态清晰。
- [ ] sidebar 不影响 VNCViewer 渲染隔离。

### 注意事项

- 删除按钮需要阻止事件冒泡，避免点击删除同时触发 session 切换。
- 不要在 sidebar 里直接读取或渲染完整 messages/events。

## Phase 11: Responsive Layout Polish

### 目标

完善桌面和移动端布局，保持操作效率和可读性。

### 涉及文件

- `components/dashboard/DashboardShell.tsx`
- `components/dashboard/ChatPanel.tsx`
- `components/dashboard/DesktopPanel.tsx`
- `components/dashboard/SessionSidebar.tsx`
- `app/globals.css`

### 任务清单

- [ ] 桌面端使用现有 `ResizablePanelGroup` 实现水平 resizable panels。
- [ ] 桌面端布局为 sidebar、chat panel、desktop panel。
- [ ] sidebar 使用固定或可控宽度，不参与 VNC iframe 重渲染。
- [ ] chat panel 内部消息区域可滚动，输入框固定在底部。
- [ ] desktop panel 中 VNC viewer 占主要空间，tool detail panel 放在下方或侧边。
- [ ] 移动端提供 Chat/Desktop 切换，或纵向堆叠。
- [ ] 移动端保持输入框可用，VNC 不与聊天内容重叠。
- [ ] 所有按钮文本和状态文案在窄屏不溢出。

### 验收标准

- [ ] 桌面端有清晰三栏结构。
- [ ] chat 和 desktop 面板可水平调整。
- [ ] 移动端可完成基本聊天操作。
- [ ] Tool detail、DebugPanel、MessageList 不互相遮挡。

### 注意事项

- 不要做 landing page；首屏就是可用 dashboard。
- 避免嵌套卡片和过度装饰，保持工具型界面风格。

## Phase 12: README Rewrite

### 目标

把 README 改写为新 AI Agent Dashboard 的说明文档。

### 涉及文件

- `README.md`

### 任务清单

- [ ] README 第一行必须是 `Author: [Your Full Name]`。
- [ ] 不要擅自替换真实作者名；如果没有用户提供姓名，保留占位符。
- [ ] 标题改为 `# AI Agent Dashboard`。
- [ ] 添加 `## Overview`。
- [ ] 添加 `## Features`。
- [ ] 添加 `## Architecture`。
- [ ] 添加 `## Event Pipeline`。
- [ ] 添加 `## Session Persistence`。
- [ ] 添加 `## VNC Performance Optimization`。
- [ ] 添加 `## TypeScript Design`。
- [ ] 添加 `## Running Locally`。
- [ ] 添加 `## Environment Variables`。
- [ ] 添加 `## Deployment`。
- [ ] 添加 `## Security Notes`。
- [ ] 添加 `## Future Improvements`。
- [ ] 明确说明本项目基于 Vercel AI SDK Computer Use Demo。
- [ ] 说明 Zustand stores、localStorage session persistence、VNC memoization。
- [ ] 说明 `No any` 和 discriminated unions。

### 验收标准

- [ ] README 结构与要求完全匹配。
- [ ] 运行说明包含 `pnpm install`、`pnpm dev`、snapshot 创建和必要环境变量。
- [ ] Security Notes 提醒 API key、Vercel token、Sandbox 和 VNC URL 风险。

### 注意事项

- README 需要面向使用者和维护者，不要只写实现细节。
- 保留必要的本地运行和部署信息，避免丢失原 README 的关键信息。

## 最终验收清单

- [ ] App 可以本地运行。
- [ ] 存在 AI Agent Dashboard 页面。
- [ ] 左侧有 chat panel。
- [ ] 左侧有 inline tool call visualization。
- [ ] 左侧有 collapsible debug panel。
- [ ] 右侧有 VNC viewer。
- [ ] 右侧有 current/selected tool call detail panel。
- [ ] 面板可以水平 resize。
- [ ] 存在 session sidebar。
- [ ] 所有 tool calls 都会被捕获成 typed events。
- [ ] Event 包含 id、timestamp、type、payload、status、duration。
- [ ] Derived state 包含 counts by action type。
- [ ] Derived state 包含 agent status。
- [ ] 支持多个 chat sessions。
- [ ] create session 可用。
- [ ] switch session 可用。
- [ ] delete session 可用。
- [ ] sessions 持久化到 localStorage。
- [ ] 刷新后 sessions、messages、events 可恢复。
- [ ] 代码中没有 `any`。
- [ ] Tool events 使用 discriminated unions。
- [ ] VNC viewer 不会因 chat messages 更新而重新渲染。
- [ ] README 第一行是 `Author: [Your Full Name]`。
- [ ] README 清楚解释 architecture、event pipeline、session persistence、VNC performance optimization 和 TypeScript design。

## 实施完成前必须运行的检查

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] 手动验证 desktop 初始化和 VNC iframe 显示。
- [ ] 手动验证发送消息后 tool event card、debug panel、detail panel 更新。
- [ ] 手动验证新建、切换、删除 session。
- [ ] 手动验证刷新页面后 session 恢复。
- [ ] 手动观察或通过 dev-only log 验证聊天更新不触发 `VNCViewer` 重新渲染。
