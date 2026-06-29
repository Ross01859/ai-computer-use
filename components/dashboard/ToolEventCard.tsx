"use client";

import type { LucideIcon } from "lucide-react";
import {
  Camera,
  CheckCircle,
  CircleSlash,
  Clock,
  Keyboard,
  KeyRound,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolEvent } from "@/types/tool-event";

type ToolEventCardProps = {
  event: ToolEvent;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

const eventLabels: Record<ToolEvent["type"], string> = {
  screenshot: "Screenshot",
  wait: "Wait",
  left_click: "Left click",
  double_click: "Double click",
  right_click: "Right click",
  mouse_move: "Mouse move",
  type: "Type",
  key: "Key press",
  scroll: "Scroll",
  left_click_drag: "Drag",
  bash: "Bash",
  navigate: "Navigate",
};

const eventIcons: Record<ToolEvent["type"], LucideIcon> = {
  screenshot: Camera,
  wait: Clock,
  left_click: MousePointer,
  double_click: MousePointerClick,
  right_click: MousePointerClick,
  mouse_move: MousePointer,
  type: Keyboard,
  key: KeyRound,
  scroll: ScrollText,
  left_click_drag: MousePointerClick,
  bash: Terminal,
  navigate: MousePointer,
};

export function ToolEventCard({
  event,
  isSelected,
  onSelect,
}: ToolEventCardProps) {
  const Icon = eventIcons[event.type];
  const preview = getPayloadPreview(event);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event.id)}
      className={cn(
        "w-full rounded-md border bg-zinc-50 p-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800",
        isSelected && "border-blue-500 ring-2 ring-blue-500/20",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-800">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{eventLabels[event.type]}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] uppercase tracking-normal",
                getStatusClass(event.status),
              )}
            >
              {event.status}
            </span>
            {typeof event.duration === "number" && (
              <span className="text-xs text-zinc-500">
                {formatDuration(event.duration)}
              </span>
            )}
          </div>
          {preview && (
            <div className="mt-1 truncate font-mono text-xs text-zinc-500">
              {preview}
            </div>
          )}
          {event.error && (
            <div className="mt-1 line-clamp-2 text-xs text-red-600">
              {event.error}
            </div>
          )}
        </div>
        <StatusIcon event={event} />
      </div>
    </button>
  );
}

function StatusIcon({ event }: { event: ToolEvent }) {
  if (event.status === "running" || event.status === "pending") {
    return <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />;
  }

  if (event.status === "aborted") {
    return <CircleSlash className="h-4 w-4 text-amber-600" />;
  }

  if (event.status === "error") {
    return <TriangleAlert className="h-4 w-4 text-red-600" />;
  }

  return <CheckCircle className="h-4 w-4 text-green-600" />;
}

function getPayloadPreview(event: ToolEvent) {
  switch (event.type) {
    case "bash":
      return truncate(event.payload.command);
    case "type":
      return truncate(event.payload.text);
    case "key":
      return event.payload.key;
    case "left_click":
    case "right_click":
    case "double_click":
      return `(${event.payload.x ?? "?"}, ${event.payload.y ?? "?"})`;
    case "mouse_move":
      return `to (${event.payload.x}, ${event.payload.y})`;
    case "left_click_drag":
      return `(${event.payload.startX}, ${event.payload.startY}) -> (${event.payload.endX}, ${event.payload.endY})`;
    case "scroll":
      return `${event.payload.direction} by ${event.payload.amount}`;
    case "wait":
      return event.payload.durationMs
        ? `${event.payload.durationMs / 1000}s`
        : "";
    case "screenshot":
      return "Screenshot captured";
    case "navigate":
      return truncate(event.payload.url);
    default:
      return "";
  }
}

function getStatusClass(status: ToolEvent["status"]) {
  switch (status) {
    case "running":
    case "pending":
      return "bg-blue-100 text-blue-700";
    case "success":
      return "bg-green-100 text-green-700";
    case "aborted":
      return "bg-amber-100 text-amber-700";
    case "error":
      return "bg-red-100 text-red-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function formatDuration(duration: number) {
  if (duration < 1000) {
    return `${duration}ms`;
  }

  return `${(duration / 1000).toFixed(1)}s`;
}

function truncate(value: string, maxLength = 80) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
