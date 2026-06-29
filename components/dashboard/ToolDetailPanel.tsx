"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selectLatestEvent, useEventStore } from "@/stores/event-store";
import { useUIStore } from "@/stores/ui-store";

export function ToolDetailPanel() {
  const events = useEventStore((state) => state.events);
  const latestEvent = useEventStore(selectLatestEvent);
  const selectedEventId = useUIStore((state) => state.selectedEventId);
  const setSelectedEventId = useUIStore((state) => state.setSelectedEventId);
  const event =
    events.find((item) => item.id === selectedEventId) ?? latestEvent;

  if (!event) {
    return (
      <div className="border-t border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        No tool calls yet.
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-auto border-t border-zinc-200 bg-white p-4 text-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Tool Details</h3>
          <p className="text-xs text-zinc-500">{event.type}</p>
        </div>
        {selectedEventId && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSelectedEventId(null)}
            aria-label="Clear selected tool event"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <dl className="grid gap-2">
        <Detail label="ID" value={event.id} />
        <Detail label="Timestamp" value={new Date(event.timestamp).toLocaleString()} />
        <Detail label="Status" value={event.status} />
        {typeof event.duration === "number" && (
          <Detail label="Duration" value={`${event.duration}ms`} />
        )}
      </dl>

      <h4 className="mb-1 mt-4 text-xs font-medium uppercase text-zinc-500">
        Payload
      </h4>
      <pre className="max-h-36 overflow-auto rounded border bg-zinc-50 p-2 text-xs">
        {JSON.stringify(event.payload, null, 2)}
      </pre>

      {(event.result || event.error) && (
        <>
          <h4 className="mb-1 mt-4 text-xs font-medium uppercase text-zinc-500">
            {event.error ? "Error" : "Result"}
          </h4>
          <pre className="max-h-36 overflow-auto rounded border bg-zinc-50 p-2 text-xs">
            {event.error ?? event.result}
          </pre>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <dt className="text-xs uppercase text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-xs">{value}</dd>
    </div>
  );
}
