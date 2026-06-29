import { describe, expect, it } from "vitest";
import type { UIMessage as Message } from "ai";
import { ABORTED } from "@/lib/utils";
import {
  extractToolEventsFromMessages,
  getToolEventPartId,
} from "@/lib/tool-events/extract-tool-events";

describe("extractToolEventsFromMessages", () => {
  it("normalizes computer and bash tool calls into stable events", () => {
    const messages = [
      {
        id: "assistant-1",
        role: "assistant",
        content: "",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        parts: [
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: "tool-click-1",
              toolName: "computer",
              state: "result",
              args: {
                action: "left_click",
                coordinate: [12, 34],
              },
              result: "clicked",
            },
          },
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: "tool-bash-1",
              toolName: "bash",
              state: "call",
              args: {
                command: "npm test",
              },
            },
          },
        ],
      },
    ] as unknown as Message[];

    const events = extractToolEventsFromMessages(messages);

    expect(typeof events[0]?.duration).toBe("number");
    expect(events[0]).toMatchObject({
      id: "tool-click-1",
      timestamp: Date.parse("2026-01-01T00:00:00.000Z"),
      type: "left_click",
      payload: {
        x: 12,
        y: 34,
        button: "left",
        clickCount: 1,
      },
      status: "success",
      result: "clicked",
      error: undefined,
    });
    expect(events[1]).toEqual({
      id: "tool-bash-1",
      timestamp: Date.parse("2026-01-01T00:00:00.000Z"),
      type: "bash",
      payload: {
        command: "npm test",
      },
      status: "running",
      duration: undefined,
      result: undefined,
      error: undefined,
    });
  });

  it("keeps existing timestamps and avoids storing screenshot image data", () => {
    const eventId = "tool-screenshot-1";
    const messages = [
      {
        id: "assistant-2",
        role: "assistant",
        content: "",
        parts: [
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: eventId,
              toolName: "computer",
              state: "result",
              args: {
                action: "screenshot",
              },
              result: {
                type: "image",
                data: "base64-image-data",
              },
            },
          },
        ],
      },
    ] as unknown as Message[];

    const events = extractToolEventsFromMessages(messages, [
      {
        id: eventId,
        timestamp: 12345,
        type: "screenshot",
        payload: {},
        status: "running",
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: eventId,
      timestamp: 12345,
      type: "screenshot",
      payload: {},
      status: "success",
      result: "Screenshot image captured",
    });
    expect(JSON.stringify(events[0])).not.toContain("base64-image-data");
  });

  it("maps aborted results and fallback ids", () => {
    const messages = [
      {
        id: "assistant-3",
        role: "assistant",
        content: "",
        parts: [
          {
            type: "tool-invocation",
            toolInvocation: {
              toolName: "computer",
              state: "result",
              args: {
                action: "wait",
                duration: 2,
              },
              result: ABORTED,
            },
          },
        ],
      },
    ] as unknown as Message[];

    const events = extractToolEventsFromMessages(messages);

    expect(events[0]).toMatchObject({
      id: getToolEventPartId("assistant-3", 0, "computer"),
      type: "wait",
      payload: {
        durationMs: 2000,
      },
      status: "aborted",
      result: ABORTED,
    });
  });
});
