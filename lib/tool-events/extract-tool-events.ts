import type { UIMessage as Message } from "ai";
import { ABORTED } from "@/lib/utils";
import type {
  ComputerToolAction,
  ToolEvent,
  ToolEventStatus,
} from "@/types/tool-event";
import { getCoordinate, getNumber, getString, isRecord } from "./tool-event-guards";

const COMPUTER_ACTIONS: readonly ComputerToolAction[] = [
  "screenshot",
  "wait",
  "left_click",
  "double_click",
  "right_click",
  "mouse_move",
  "type",
  "key",
  "scroll",
  "left_click_drag",
];

const isComputerAction = (value: unknown): value is ComputerToolAction =>
  typeof value === "string" &&
  COMPUTER_ACTIONS.includes(value as ComputerToolAction);

export const getToolEventPartId = (
  messageId: string,
  partIndex: number,
  toolName: string,
  toolCallId?: string,
) => toolCallId ?? `${messageId}:${partIndex}:${toolName}`;

export function extractToolEventsFromMessages(
  messages: Message[],
  previousEvents: ToolEvent[] = [],
): ToolEvent[] {
  const previousById = new Map(
    previousEvents.map((event) => [event.id, event] as const),
  );
  const events: ToolEvent[] = [];

  messages.forEach((message) => {
    const parts = getMessageParts(message);

    parts.forEach((part, partIndex) => {
      const invocation = getToolInvocation(part);
      if (!invocation) {
        return;
      }

      const toolName = getString(invocation, "toolName");
      const id = getToolEventPartId(
        message.id,
        partIndex,
        toolName ?? "tool",
        getString(invocation, "toolCallId"),
      );
      const previous = previousById.get(id);
      const timestamp =
        previous?.timestamp ?? getMessageTimestamp(message) ?? Date.now();
      const state = getString(invocation, "state");
      const result = invocation.result;
      const status = getStatus(state, result);
      const duration =
        previous?.duration ??
        (status === "success" || status === "error" || status === "aborted"
          ? Math.max(Date.now() - timestamp, 0)
          : undefined);
      const resultText = getResultText(result);
      const error = status === "error" ? resultText : undefined;
      const args = isRecord(invocation.args) ? invocation.args : {};

      if (toolName === "computer") {
        const action = args.action;
        if (!isComputerAction(action)) {
          return;
        }

        const event = buildComputerEvent({
          id,
          timestamp,
          action,
          args,
          status,
          duration,
          result: status === "error" ? undefined : resultText,
          error,
        });

        if (event) {
          events.push(event);
        }
      }

      if (toolName === "bash") {
        const command = getString(args, "command") ?? "";
        events.push({
          id,
          timestamp,
          type: "bash",
          payload: { command },
          status,
          duration,
          result: status === "error" ? undefined : resultText,
          error,
        });
      }
    });
  });

  return events;
}

type ComputerEventInput = {
  id: string;
  timestamp: number;
  action: ComputerToolAction;
  args: Record<string, unknown>;
  status: ToolEventStatus;
  duration?: number;
  result?: string;
  error?: string;
};

function buildComputerEvent(input: ComputerEventInput): ToolEvent | null {
  const base = {
    id: input.id,
    timestamp: input.timestamp,
    status: input.status,
    duration: input.duration,
    result: input.result,
    error: input.error,
  };

  switch (input.action) {
    case "screenshot":
      return {
        ...base,
        type: "screenshot",
        payload: {},
      };
    case "wait":
      return {
        ...base,
        type: "wait",
        payload: {
          durationMs: getNumber(input.args, "duration")
            ? getNumber(input.args, "duration")! * 1000
            : undefined,
        },
      };
    case "left_click":
    case "double_click":
    case "right_click": {
      const coordinate = getCoordinate(input.args.coordinate);
      return {
        ...base,
        type: input.action,
        payload: {
          x: coordinate?.[0],
          y: coordinate?.[1],
          button: input.action === "right_click" ? "right" : "left",
          clickCount: input.action === "double_click" ? 2 : 1,
        },
      };
    }
    case "mouse_move": {
      const coordinate = getCoordinate(input.args.coordinate);
      if (!coordinate) {
        return null;
      }
      return {
        ...base,
        type: "mouse_move",
        payload: {
          x: coordinate[0],
          y: coordinate[1],
        },
      };
    }
    case "type":
      return {
        ...base,
        type: "type",
        payload: {
          text: getString(input.args, "text") ?? "",
        },
      };
    case "key":
      return {
        ...base,
        type: "key",
        payload: {
          key: getString(input.args, "text") ?? "",
        },
      };
    case "scroll": {
      const direction = getString(input.args, "scroll_direction");
      return {
        ...base,
        type: "scroll",
        payload: {
          direction: direction === "up" ? "up" : "down",
          amount: getNumber(input.args, "scroll_amount") ?? 0,
        },
      };
    }
    case "left_click_drag": {
      const startCoordinate = getCoordinate(input.args.start_coordinate);
      const endCoordinate = getCoordinate(input.args.coordinate);
      if (!startCoordinate || !endCoordinate) {
        return null;
      }
      return {
        ...base,
        type: "left_click_drag",
        payload: {
          startX: startCoordinate[0],
          startY: startCoordinate[1],
          endX: endCoordinate[0],
          endY: endCoordinate[1],
        },
      };
    }
    default:
      return null;
  }
}

function getMessageParts(message: Message): unknown[] {
  const candidate = (message as { parts?: unknown }).parts;
  return Array.isArray(candidate) ? candidate : [];
}

function getToolInvocation(part: unknown): Record<string, unknown> | null {
  if (!isRecord(part) || part.type !== "tool-invocation") {
    return null;
  }

  return isRecord(part.toolInvocation) ? part.toolInvocation : null;
}

function getMessageTimestamp(message: Message): number | undefined {
  const candidate = (message as { createdAt?: unknown }).createdAt;

  if (candidate instanceof Date) {
    return candidate.getTime();
  }

  if (typeof candidate === "number") {
    return candidate;
  }

  if (typeof candidate === "string") {
    const parsed = Date.parse(candidate);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

function getStatus(state: string | undefined, result: unknown): ToolEventStatus {
  if (result === ABORTED) {
    return "aborted";
  }

  const resultText = getResultText(result);
  if (resultText?.startsWith("Error executing command")) {
    return "error";
  }

  if (state === "result") {
    return "success";
  }

  if (state === "call") {
    return "running";
  }

  return "pending";
}

function getResultText(result: unknown): string | undefined {
  if (typeof result === "string") {
    return result;
  }

  if (!isRecord(result)) {
    return undefined;
  }

  const type = getString(result, "type");
  if (type === "image") {
    return "Screenshot image captured";
  }

  return getString(result, "text");
}
