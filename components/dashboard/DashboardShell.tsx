"use client";

import { useEffect, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { type MobileView, useUIStore } from "@/stores/ui-store";
import { ChatPanel } from "./ChatPanel";
import { DesktopPanel } from "./DesktopPanel";
import { SessionSidebar } from "./SessionSidebar";

const mobileTabs: Array<{ value: MobileView; label: string }> = [
  { value: "sessions", label: "Sessions" },
  { value: "chat", label: "Chat" },
  { value: "desktop", label: "Desktop" },
];

type DashboardShellProps = {
  desktopPrerequisiteError: string | null;
};

export function DashboardShell({
  desktopPrerequisiteError,
}: DashboardShellProps) {
  const isDesktop = useIsDesktop();
  const mobileView = useUIStore((state) => state.mobileView);
  const setMobileView = useUIStore((state) => state.setMobileView);
  const ensureSession = useSessionStore((state) => state.ensureSession);

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  if (isDesktop === null) {
    return (
      <main className="flex h-dvh items-center justify-center bg-white text-sm text-zinc-500">
        Loading dashboard...
      </main>
    );
  }

  if (isDesktop) {
    return (
      <main className="h-dvh bg-white">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={16} minSize={12} maxSize={24}>
            <SessionSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={34} minSize={25}>
            <ChatPanel className="h-full" />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={35}>
            <DesktopPanel
              className="h-full"
              desktopPrerequisiteError={desktopPrerequisiteError}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-white">
      <nav className="grid grid-cols-3 border-b border-zinc-200 bg-zinc-50 p-2">
        {mobileTabs.map((tab) => (
          <button
            type="button"
            key={tab.value}
            onClick={() => setMobileView(tab.value)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium",
              mobileView === tab.value
                ? "bg-white shadow-sm"
                : "text-zinc-500 hover:bg-white/70",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        <SessionSidebar
          className={cn("h-full", mobileView !== "sessions" && "hidden")}
        />
        <ChatPanel className={cn("h-full", mobileView !== "chat" && "hidden")} />
        <DesktopPanel
          className={cn("h-full", mobileView !== "desktop" && "hidden")}
          desktopPrerequisiteError={desktopPrerequisiteError}
        />
      </div>
    </main>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
