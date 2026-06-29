"use client";

import type { UIMessage as Message } from "ai";
import { useMemo } from "react";
import { PreviewMessage } from "@/components/message";
import { ProjectInfo } from "@/components/project-info";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import type { ToolEvent } from "@/types/tool-event";

type MessageListProps = {
  messages: Message[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  events: ToolEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
};

export function MessageList({
  messages,
  isLoading,
  status,
  events,
  selectedEventId,
  onSelectEvent,
}: MessageListProps) {
  const [containerRef, endRef] = useScrollToBottom();
  const toolEventsById = useMemo(
    () =>
      events.reduce<Record<string, ToolEvent>>((accumulator, event) => {
        accumulator[event.id] = event;
        return accumulator;
      }, {}),
    [events],
  );

  return (
    <div
      className="flex-1 space-y-6 overflow-y-auto px-4 py-4"
      ref={containerRef}
    >
      {messages.length === 0 ? <ProjectInfo /> : null}
      {messages.map((message, index) => (
        <PreviewMessage
          message={message}
          key={message.id}
          isLoading={isLoading}
          status={status}
          isLatestMessage={index === messages.length - 1}
          toolEventsById={toolEventsById}
          selectedEventId={selectedEventId}
          onSelectToolEvent={onSelectEvent}
        />
      ))}
      <div ref={endRef} className="pb-2" />
    </div>
  );
}
