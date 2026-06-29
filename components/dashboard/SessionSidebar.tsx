"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

type SessionSidebarProps = {
  className?: string;
};

export function SessionSidebar({ className }: SessionSidebarProps) {
  const sessions = useSessionStore((state) => state.sessions);
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const createSession = useSessionStore((state) => state.createSession);
  const switchSession = useSessionStore((state) => state.switchSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-zinc-200 bg-zinc-50",
        className,
      )}
    >
      <div className="border-b border-zinc-200 p-3">
        <Button
          type="button"
          onClick={createSession}
          className="w-full justify-start"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group mb-1 flex items-start gap-2 rounded-md text-sm hover:bg-white",
              session.id === currentSessionId && "bg-white shadow-sm",
            )}
          >
            <button
              type="button"
              onClick={() => switchSession(session.id)}
              className="min-w-0 flex-1 px-2 py-2 text-left"
            >
              <span className="block truncate font-medium">
                {session.title}
              </span>
              <span className="block text-xs text-zinc-500">
                {new Date(session.updatedAt).toLocaleString()}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Delete ${session.title}`}
              onClick={(event) => {
                event.stopPropagation();
                if (window.confirm(`Delete "${session.title}"?`)) {
                  deleteSession(session.id);
                }
              }}
              className="mr-1 mt-1 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-red-600 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
