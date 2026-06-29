"use client";

import { useMemo } from "react";
import {
  selectAgentStatus,
  selectLatestEvent,
  selectTotalEvents,
  useEventStore,
} from "@/stores/event-store";
import { useUIStore } from "@/stores/ui-store";
import type { ToolEventType } from "@/types/tool-event";

export function DebugPanel() {
  const events = useEventStore((state) => state.events);
  const agentStatus = useEventStore(selectAgentStatus);
  const totalEvents = useEventStore(selectTotalEvents);
  const latestEvent = useEventStore(selectLatestEvent);
  const isDebugOpen = useUIStore((state) => state.isDebugOpen);
  const setDebugOpen = useUIStore((state) => state.setDebugOpen);
  const failedEventCount = useMemo(
    () => events.filter((event) => event.status === "error").length,
    [events],
  );
  const countsByType = useMemo(
    () =>
      events.reduce(
        (counts, event) => {
          counts[event.type] = (counts[event.type] ?? 0) + 1;
          return counts;
        },
        {} as Partial<Record<ToolEventType, number>>,
      ),
    [events],
  );

  return (
    <details
      open={isDebugOpen}
      onToggle={(event) => setDebugOpen(event.currentTarget.open)}
      className="border-t border-zinc-200 bg-white px-4 py-3 text-sm"
    >
      <summary className="cursor-pointer select-none font-medium">
        Debug
      </summary>
      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Status" value={agentStatus} />
          <Metric label="Events" value={String(totalEvents)} />
          <Metric label="Failed" value={String(failedEventCount)} />
        </div>

        <section>
          <h4 className="mb-1 text-xs font-medium uppercase text-zinc-500">
            Counts by type
          </h4>
          <pre className="max-h-28 overflow-auto rounded border bg-zinc-50 p-2 text-xs">
            {JSON.stringify(countsByType, null, 2)}
          </pre>
        </section>

        <section>
          <h4 className="mb-1 text-xs font-medium uppercase text-zinc-500">
            Latest event
          </h4>
          <pre className="max-h-36 overflow-auto rounded border bg-zinc-50 p-2 text-xs">
            {latestEvent ? JSON.stringify(latestEvent, null, 2) : "None"}
          </pre>
        </section>

        <section>
          <h4 className="mb-1 text-xs font-medium uppercase text-zinc-500">
            Raw events
          </h4>
          <pre className="max-h-56 overflow-auto rounded border bg-zinc-50 p-2 text-xs">
            {JSON.stringify(events, null, 2)}
          </pre>
        </section>
      </div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-zinc-50 p-2">
      <div className="text-[11px] uppercase text-zinc-500">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}
