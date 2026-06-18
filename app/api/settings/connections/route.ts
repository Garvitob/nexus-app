import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";

// Integrations we surface in Settings. label + the Corsair plugin probe path.
const INTEGRATIONS = [
  { id: "gmail", label: "Gmail", probe: "gmail.db.messages.search" },
  {
    id: "googlecalendar",
    label: "Google Calendar",
    probe: "googlecalendar.db.events.search",
  },
  { id: "github", label: "GitHub", probe: "github.db.pullRequests.search" },
  { id: "jira", label: "Jira", probe: "jira.db.issues.search" },
  { id: "notion", label: "Notion", probe: "notion.db.pages.search" },
];

export async function GET() {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  const results = await Promise.all(
    INTEGRATIONS.map(async (integ) => {
      try {
        const res = (await tenant.run(integ.probe, {})) as {
          success?: boolean;
        };
        // A successful probe (even with empty data) means credentials exist
        return {
          id: integ.id,
          label: integ.label,
          connected: res?.success === true,
        };
      } catch {
        return { id: integ.id, label: integ.label, connected: false };
      }
    })
  );

  return NextResponse.json({ connections: results });
}