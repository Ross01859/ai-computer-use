"use client";

import { useEffect } from "react";
import { MonitorUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDesktopURL } from "@/lib/sandbox/utils";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { ToolDetailPanel } from "./ToolDetailPanel";
import { VNCViewer } from "./VNCViewer";

type DesktopPanelProps = {
  className?: string;
  desktopPrerequisiteError: string | null;
};

let desktopInitPromise: ReturnType<typeof getDesktopURL> | null = null;

function initializeDesktop() {
  desktopInitPromise ??= getDesktopURL().finally(() => {
    desktopInitPromise = null;
  });

  return desktopInitPromise;
}

export function DesktopPanel({
  className,
  desktopPrerequisiteError,
}: DesktopPanelProps) {
  const sandboxId = useUIStore((state) => state.sandboxId);
  const streamUrl = useUIStore((state) => state.streamUrl);
  const isInitializing = useUIStore((state) => state.isDesktopInitializing);
  const desktopError = useUIStore((state) => state.desktopError);
  const setSandbox = useUIStore((state) => state.setSandbox);
  const setDesktopInitializing = useUIStore(
    (state) => state.setDesktopInitializing,
  );
  const setDesktopError = useUIStore((state) => state.setDesktopError);

  useEffect(() => {
    if (desktopPrerequisiteError) {
      setDesktopError(desktopPrerequisiteError);
      setDesktopInitializing(false);
      return;
    }

    const currentState = useUIStore.getState();
    if (
      currentState.streamUrl ||
      currentState.isDesktopInitializing ||
      currentState.desktopError
    ) {
      return;
    }

    setDesktopInitializing(true);
    setDesktopError(null);
    initializeDesktop()
      .then((desktop) => {
        if (desktop.ok) {
          setSandbox(desktop.id, desktop.streamUrl);
        } else {
          setDesktopError(desktop.error);
        }
      })
      .catch((error) => {
        console.error("Failed to initialize desktop:", error);
        setDesktopError(
          error instanceof Error
            ? error.message
            : "Failed to initialize desktop",
        );
        toast.error("Failed to initialize desktop");
      })
      .finally(() => {
        setDesktopInitializing(false);
      });
  }, [
    desktopPrerequisiteError,
    setDesktopError,
    setDesktopInitializing,
    setSandbox,
  ]);

  useEffect(() => {
    if (!sandboxId) {
      return;
    }

    const killDesktop = () => {
      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`,
      );
    };

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const eventName = isIOS || isSafari ? "pagehide" : "beforeunload";

    window.addEventListener(eventName, killDesktop);

    return () => {
      window.removeEventListener(eventName, killDesktop);
    };
  }, [sandboxId]);

  const refreshDesktop = async () => {
    if (desktopPrerequisiteError) {
      setDesktopError(desktopPrerequisiteError);
      toast.error("Sandbox is not configured");
      return;
    }

    try {
      setDesktopInitializing(true);
      setDesktopError(null);
      const desktop = await getDesktopURL(sandboxId ?? undefined);
      if (desktop.ok) {
        setSandbox(desktop.id, desktop.streamUrl);
      } else {
        setDesktopError(desktop.error);
        toast.error("Failed to refresh desktop");
      }
    } catch (error) {
      console.error("Failed to refresh desktop:", error);
      setDesktopError(
        error instanceof Error ? error.message : "Failed to refresh desktop",
      );
      toast.error("Failed to refresh desktop");
    } finally {
      setDesktopInitializing(false);
    }
  };

  return (
    <section className={cn("flex min-h-0 flex-col bg-black", className)}>
      <div className="relative min-h-0 flex-1">
        {streamUrl ? (
          <>
            <VNCViewer streamUrl={streamUrl} />
            <Button
              type="button"
              onClick={refreshDesktop}
              className="absolute right-2 top-2 z-10 bg-black/50 px-3 py-1 text-sm text-white hover:bg-black/70"
              disabled={isInitializing}
            >
              <MonitorUp className="h-4 w-4" />
              {isInitializing ? "Creating desktop..." : "New desktop"}
            </Button>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-white">
            {desktopError
              ? desktopError
              : isInitializing
                ? "Initializing desktop..."
                : "Loading stream..."}
          </div>
        )}
      </div>
      <ToolDetailPanel />
    </section>
  );
}
