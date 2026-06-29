export type ToolEventStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted";

export type ComputerToolAction =
  | "screenshot"
  | "wait"
  | "left_click"
  | "double_click"
  | "right_click"
  | "mouse_move"
  | "type"
  | "key"
  | "scroll"
  | "left_click_drag";

export type ToolEventType = ComputerToolAction | "bash" | "navigate";

export type AgentStatus =
  | "idle"
  | "running"
  | "waiting"
  | "finished"
  | "error";

export type ToolEventBase<TType extends ToolEventType, TPayload> = {
  id: string;
  timestamp: number;
  type: TType;
  payload: TPayload;
  status: ToolEventStatus;
  duration?: number;
  result?: string;
  error?: string;
};

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

export type ClickToolEvent = ToolEventBase<
  "left_click" | "right_click" | "double_click",
  {
    x?: number;
    y?: number;
    button: "left" | "right";
    clickCount?: 1 | 2;
  }
>;

export type MouseMoveToolEvent = ToolEventBase<
  "mouse_move",
  {
    x: number;
    y: number;
  }
>;

export type DragToolEvent = ToolEventBase<
  "left_click_drag",
  {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }
>;

export type TypeToolEvent = ToolEventBase<
  "type",
  {
    text: string;
  }
>;

export type KeyToolEvent = ToolEventBase<
  "key",
  {
    key: string;
  }
>;

export type ScrollToolEvent = ToolEventBase<
  "scroll",
  {
    direction: "up" | "down";
    amount: number;
  }
>;

export type BashToolEvent = ToolEventBase<
  "bash",
  {
    command: string;
  }
>;

export type NavigateToolEvent = ToolEventBase<
  "navigate",
  {
    url: string;
  }
>;

export type ToolEvent =
  | ScreenshotToolEvent
  | WaitToolEvent
  | ClickToolEvent
  | MouseMoveToolEvent
  | DragToolEvent
  | TypeToolEvent
  | KeyToolEvent
  | ScrollToolEvent
  | BashToolEvent
  | NavigateToolEvent;
