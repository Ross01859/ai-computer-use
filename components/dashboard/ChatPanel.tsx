"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { AISDKLogo } from "@/components/icons";
import { DeployButton } from "@/components/project-info";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { extractToolEventsFromMessages } from "@/lib/tool-events/extract-tool-events";
import { ABORTED, cn } from "@/lib/utils";
import { useEventStore } from "@/stores/event-store";
import { useSessionStore } from "@/stores/session-store";
import { useUIStore } from "@/stores/ui-store";
import { DebugPanel } from "./DebugPanel";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

type ChatPanelProps = {
  className?: string;
};

export function ChatPanel({ className }: ChatPanelProps) {
  const skipNextMessageSyncRef = useRef(false);
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const sandboxId = useUIStore((state) => state.sandboxId);
  const isDesktopInitializing = useUIStore(
    (state) => state.isDesktopInitializing,
  );
  const selectedEventId = useUIStore((state) => state.selectedEventId);
  const setSelectedEventId = useUIStore((state) => state.setSelectedEventId);
  const events = useEventStore((state) => state.events);
  const replaceEvents = useEventStore((state) => state.replaceEvents);
  const updateCurrentSessionMessages = useSessionStore(
    (state) => state.updateCurrentSessionMessages,
  );
  const updateCurrentSessionEvents = useSessionStore(
    (state) => state.updateCurrentSessionEvents,
  );
  const initialMessages = useMemo(() => {
    const session = useSessionStore
      .getState()
      .sessions.find((item) => item.id === currentSessionId);
    return session?.messages ?? [];
  }, [currentSessionId]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop: stopGeneration,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id: currentSessionId,
    initialMessages,
    body: {
      sandboxId,
    },
    maxSteps: 30,
    onError: (error) => {
      console.error(error);
      toast.error("There was an error", {
        description: "Please try again later.",
        richColors: true,
        position: "top-center",
      });
    },
  });

  useEffect(() => {
    const session = useSessionStore
      .getState()
      .sessions.find((item) => item.id === currentSessionId);

    skipNextMessageSyncRef.current = true;
    setMessages(session?.messages ?? []);
    replaceEvents(session?.events ?? []);
    setSelectedEventId(null);
  }, [currentSessionId, replaceEvents, setMessages, setSelectedEventId]);

  useEffect(() => {
    if (skipNextMessageSyncRef.current) {
      skipNextMessageSyncRef.current = false;
      return;
    }

    const nextEvents = extractToolEventsFromMessages(
      messages,
      useEventStore.getState().events,
    );
    replaceEvents(nextEvents);
    updateCurrentSessionMessages(messages);
    updateCurrentSessionEvents(nextEvents);
  }, [
    messages,
    replaceEvents,
    updateCurrentSessionEvents,
    updateCurrentSessionMessages,
  ]);

  const stop = () => {
    stopGeneration();

    const lastMessage = messages.at(-1);
    const lastMessageLastPart = lastMessage?.parts.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      lastMessageLastPart?.type === "tool-invocation"
    ) {
      setMessages((previousMessages) => [
        ...previousMessages.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...lastMessage.parts.slice(0, -1),
            {
              ...lastMessageLastPart,
              toolInvocation: {
                ...lastMessageLastPart.toolInvocation,
                state: "result",
                result: ABORTED,
              },
            },
          ],
        },
      ]);
    }
  };

  const isLoading = status !== "ready";
  const isInputDisabled = isLoading || isDesktopInitializing || !sandboxId;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col border-l border-zinc-200 bg-white",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <AISDKLogo />
        <DeployButton />
      </div>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        status={status}
        events={events}
        selectedEventId={selectedEventId}
        onSelectEvent={setSelectedEventId}
      />

      {messages.length === 0 && (
        <PromptSuggestions
          disabled={isInputDisabled}
          submitPrompt={(prompt: string) =>
            append({ role: "user", content: prompt })
          }
        />
      )}

      <DebugPanel />

      <div className="border-t border-zinc-200 bg-white">
        <form onSubmit={handleSubmit} className="p-4">
          <MessageInput
            handleInputChange={handleInputChange}
            input={input}
            isInitializing={isDesktopInitializing || !sandboxId}
            isLoading={isLoading}
            status={status}
            stop={stop}
          />
        </form>
      </div>
    </section>
  );
}
