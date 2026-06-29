"use client";

import type { UIMessage as Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { ToolEventCard } from "@/components/dashboard/ToolEventCard";
import { getToolEventPartId } from "@/lib/tool-events/extract-tool-events";
import { cn } from "@/lib/utils";
import type { ToolEvent } from "@/types/tool-event";

type PreviewMessageProps = {
  message: Message;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  toolEventsById?: Record<string, ToolEvent>;
  selectedEventId?: string | null;
  onSelectToolEvent?: (id: string) => void;
};

const PurePreviewMessage = ({
  message,
  toolEventsById,
  selectedEventId,
  onSelectToolEvent,
}: PreviewMessageProps) => {
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex w-full gap-4 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit",
          )}
        >
          <div className="flex w-full flex-col">
            {message.parts?.map((part, index) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${index}`}
                      className="flex w-full flex-row items-start gap-2 pb-4"
                    >
                      <div
                        className={cn("flex flex-col gap-4", {
                          "rounded-xl bg-secondary px-3 py-2 text-secondary-foreground":
                            message.role === "user",
                        })}
                      >
                        <Streamdown>{part.text}</Streamdown>
                      </div>
                    </motion.div>
                  );
                case "tool-invocation": {
                  const { toolName, toolCallId, args } = part.toolInvocation;
                  const eventId = getToolEventPartId(
                    message.id,
                    index,
                    toolName,
                    toolCallId,
                  );
                  const event = toolEventsById?.[eventId];
                  const imageData = getImageData(
                    getToolInvocationResult(part.toolInvocation),
                  );

                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${index}`}
                      className="mb-3 flex flex-col gap-2"
                    >
                      {event ? (
                        <ToolEventCard
                          event={event}
                          isSelected={selectedEventId === event.id}
                          onSelect={onSelectToolEvent}
                        />
                      ) : (
                        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                          {toolName} tool call
                        </div>
                      )}

                      {imageData ? (
                        <div className="p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${imageData}`}
                            alt="Generated Image"
                            className="aspect-[1024/768] w-full rounded-sm"
                          />
                        </div>
                      ) : isScreenshotCall(toolName, args) ? (
                        <div className="aspect-[1024/768] w-full animate-pulse rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                      ) : null}
                    </motion.div>
                  );
                }
                default:
                  return null;
              }
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (prevProps.toolEventsById !== nextProps.toolEventsById) return false;
    if (prevProps.selectedEventId !== nextProps.selectedEventId) return false;

    return true;
  },
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getImageData(result: unknown) {
  if (!isRecord(result)) {
    return null;
  }

  return result.type === "image" && typeof result.data === "string"
    ? result.data
    : null;
}

function getToolInvocationResult(invocation: unknown) {
  return isRecord(invocation) ? invocation.result : undefined;
}

function isScreenshotCall(toolName: string, args: unknown) {
  return (
    toolName === "computer" &&
    isRecord(args) &&
    args.action === "screenshot"
  );
}
