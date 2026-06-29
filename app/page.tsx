import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default function Page() {
  return <DashboardShell desktopPrerequisiteError={getDesktopPrerequisiteError()} />;
}

function getDesktopPrerequisiteError() {
  if (!process.env.SANDBOX_SNAPSHOT_ID) {
    return "SANDBOX_SNAPSHOT_ID is not configured";
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    return null;
  }

  const credentials = {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  };
  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length === 0) {
    return null;
  }

  if (missing.length < 3) {
    return `Vercel Sandbox authentication is incomplete. Missing: ${missing.join(
      ", ",
    )}.`;
  }

  return "Vercel Sandbox authentication is not configured. Run `npx vercel link && npx vercel env pull`, or set VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID in .env.local.";
}
