import { describe, expect, it } from "vitest";
import {
  type EventStore,
  selectAgentStatus,
  selectEventCountsByType,
  selectFailedEvents,
  selectLatestEvent,
  selectRunningEvents,
  selectTotalEvents,
} from "@/stores/event-store";
import type { ToolEvent } from "@/types/tool-event";

const createState = (events: ToolEvent[]): EventStore => ({
  events,
  addEvent: () => undefined,
  updateEvent: () => undefined,
  replaceEvents: () => undefined,
  clearEvents: () => undefined,
});

describe("event-store selectors", () => {
  it("derives counts, running events, failed events, latest event, and totals", () => {
    const events: ToolEvent[] = [
      {
        id: "event-1",
        timestamp: 1,
        type: "bash",
        payload: { command: "npm test" },
        status: "running",
      },
      {
        id: "event-2",
        timestamp: 2,
        type: "screenshot",
        payload: {},
        status: "success",
      },
      {
        id: "event-3",
        timestamp: 3,
        type: "bash",
        payload: { command: "npm build" },
        status: "error",
        error: "failed",
      },
    ];
    const state = createState(events);

    expect(selectTotalEvents(state)).toBe(3);
    expect(selectLatestEvent(state)?.id).toBe("event-3");
    expect(selectRunningEvents(state).map((event) => event.id)).toEqual([
      "event-1",
    ]);
    expect(selectFailedEvents(state).map((event) => event.id)).toEqual([
      "event-3",
    ]);
    expect(selectEventCountsByType(state)).toEqual({
      bash: 2,
      screenshot: 1,
    });
    expect(selectAgentStatus(state)).toBe("running");
  });

  it("derives agent status from event state", () => {
    expect(selectAgentStatus(createState([]))).toBe("idle");
    expect(
      selectAgentStatus(
        createState([
          {
            id: "pending",
            timestamp: 1,
            type: "wait",
            payload: {},
            status: "pending",
          },
        ]),
      ),
    ).toBe("waiting");
    expect(
      selectAgentStatus(
        createState([
          {
            id: "error",
            timestamp: 1,
            type: "type",
            payload: { text: "hello" },
            status: "error",
          },
        ]),
      ),
    ).toBe("error");
    expect(
      selectAgentStatus(
        createState([
          {
            id: "success",
            timestamp: 1,
            type: "screenshot",
            payload: {},
            status: "success",
          },
        ]),
      ),
    ).toBe("finished");
  });
});
