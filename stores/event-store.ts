"use client";

import { create } from "zustand";
import type { AgentStatus, ToolEvent } from "@/types/tool-event";

type EventStore = {
  events: ToolEvent[];
  addEvent: (event: ToolEvent) => void;
  updateEvent: (id: string, patch: Partial<ToolEvent>) => void;
  replaceEvents: (events: ToolEvent[]) => void;
  clearEvents: () => void;
};

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  addEvent: (event) =>
    set((state) => {
      if (state.events.some((item) => item.id === event.id)) {
        return { events: state.events };
      }
      return { events: [...state.events, event] };
    }),
  updateEvent: (id, patch) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? ({ ...event, ...patch } as ToolEvent) : event,
      ),
    })),
  replaceEvents: (events) => set({ events }),
  clearEvents: () => set({ events: [] }),
}));

export const selectLatestEvent = (state: EventStore) =>
  state.events.at(-1) ?? null;

export const selectAgentStatus = (state: EventStore): AgentStatus => {
  if (state.events.some((event) => event.status === "running")) {
    return "running";
  }

  const latestEvent = selectLatestEvent(state);

  if (!latestEvent) {
    return "idle";
  }

  if (latestEvent.status === "error") {
    return "error";
  }

  if (latestEvent.status === "pending") {
    return "waiting";
  }

  return "finished";
};

export const selectTotalEvents = (state: EventStore) => state.events.length;
