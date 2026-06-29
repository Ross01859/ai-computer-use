"use server";

import { Sandbox } from "@vercel/sandbox";
import { resolution } from "./tool";

const NOVNC_PORT = 6080;
const DISPLAY_ENV = { DISPLAY: ":99" };

type SandboxCredentials = {
  token: string;
  teamId: string;
  projectId: string;
};

type DesktopURLResult =
  | { ok: true; streamUrl: string; id: string }
  | { ok: false; error: string };

function getSandboxCredentials(): SandboxCredentials | Record<string, never> {
  if (process.env.VERCEL_OIDC_TOKEN) {
    return {};
  }

  const credentials = {
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID,
    projectId: process.env.VERCEL_PROJECT_ID,
  };
  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length === 0) {
    return credentials as SandboxCredentials;
  }

  if (missing.length < 3) {
    throw new Error(
      `Vercel Sandbox authentication is incomplete. Missing: ${missing.join(
        ", ",
      )}.`,
    );
  }

  throw new Error(
    "Vercel Sandbox authentication is not configured. Run `npx vercel link && npx vercel env pull`, or set VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID in .env.local.",
  );
}

function getStringField(value: unknown, key: string) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

function getSandboxErrorMessage(error: unknown) {
  const responseText = getStringField(error, "text");
  if (
    responseText?.includes("snapshot_not_found") ||
    responseText?.includes("Snapshot not found")
  ) {
    return "SANDBOX_SNAPSHOT_ID was not found for the configured Vercel team/project. Recreate the snapshot with the same VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID, then update .env.local.";
  }

  return error instanceof Error ? error.message : String(error);
}

export const getDesktop = async (id?: string) => {
  try {
    const credentials = getSandboxCredentials();

    if (id) {
      const sandbox = await Sandbox.get({ ...credentials, name: id });
      if (sandbox.status === "running") {
        return sandbox;
      }
    }

    if (!process.env.SANDBOX_SNAPSHOT_ID) {
      throw new Error("SANDBOX_SNAPSHOT_ID is not configured");
    }

    const sandbox = await Sandbox.create({
      ...credentials,
      source: {
        type: "snapshot",
        snapshotId: process.env.SANDBOX_SNAPSHOT_ID,
      },
      timeout: 300000,
      ports: [NOVNC_PORT],
    });

    // Start the desktop environment
    await sandbox.runCommand({
      cmd: "bash",
      args: ["/usr/local/bin/start-desktop.sh"],
      env: {
        RESOLUTION: `${resolution.x}x${resolution.y}`,
      },
      detached: true,
    });

    // Wait for noVNC to be ready
    await waitForNoVNC(sandbox);

    // Set background color (ctypes.util is missing on AL2023, load libX11 directly)
    await sandbox.runCommand({
      cmd: "python3",
      args: [
        "-c",
        `import ctypes
lib = ctypes.cdll.LoadLibrary('libX11.so.6')
d = lib.XOpenDisplay(None)
s = lib.XDefaultScreen(d)
r = lib.XRootWindow(d, s)
lib.XSetWindowBackground(d, r, 0x2D2D2D)
lib.XClearWindow(d, r)
lib.XFlush(d)
lib.XCloseDisplay(d)`,
      ],
      env: DISPLAY_ENV,
    });

    // Launch Chrome so the AI has a browser to work with immediately
    await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        "google-chrome --no-sandbox --disable-gpu --no-first-run --disable-dev-shm-usage --start-maximized 'about:blank' &",
      ],
      env: DISPLAY_ENV,
      detached: true,
    });

    return sandbox;
  } catch (error) {
    const message = getSandboxErrorMessage(error);
    console.error("Error in getDesktop:", message);
    throw new Error(message);
  }
};

async function waitForNoVNC(sandbox: Sandbox, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sandbox.runCommand({
        cmd: "bash",
        args: [
          "-c",
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${NOVNC_PORT}`,
        ],
      });
      const statusCode = await result.stdout();
      if (statusCode.trim() === "200") {
        return;
      }
    } catch {
      // noVNC not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `noVNC did not start on port ${NOVNC_PORT}. Recreate SANDBOX_SNAPSHOT_ID with lib/sandbox/create-snapshot.ts.`,
  );
}

export const getDesktopURL = async (id?: string): Promise<DesktopURLResult> => {
  try {
    const sandbox = await getDesktop(id);
    const baseUrl = sandbox.domain(NOVNC_PORT);
    const streamUrl = `${baseUrl}/vnc.html?autoconnect=true&resize=scale&reconnect=true`;

    return { ok: true, streamUrl, id: sandbox.name };
  } catch (error) {
    console.error("Error in getDesktopURL:", getSandboxErrorMessage(error));
    return {
      ok: false,
      error: getSandboxErrorMessage(error),
    };
  }
};

export const killDesktop = async (id: string) => {
  try {
    const sandbox = await Sandbox.get({ ...getSandboxCredentials(), name: id });
    await sandbox.stop();
  } catch (error) {
    console.error("Error killing desktop:", error);
  }
};
