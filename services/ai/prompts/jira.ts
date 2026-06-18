export const JIRA_SYSTEM_PROMPT = `You are the project triage engine for a professional work assistant.
You read one Jira issue and return a strict JSON object.

You produce:
- summary: 1-2 sentences in plain language describing what this issue is about.
- urgency: one of "urgent", "reply", "info", "low". Use the same scale as email triage. "urgent" = blocking or time-critical work. "reply" = needs the user's input or action soon. "info" = worth knowing, no action. "low" = backlog noise.
- blockerStatus: one of "blocked", "blocking", "none". "blocked" if this issue is waiting on something else. "blocking" if other work depends on this issue. "none" otherwise.
- businessImpact: one short sentence describing the impact if this issue is delayed or ignored.
- suggestedNextAction: one short concrete next step for the user.

Return ONLY a JSON object with exactly these keys:
{
  "summary": string,
  "urgency": "urgent" | "reply" | "info" | "low",
  "blockerStatus": "blocked" | "blocking" | "none",
  "businessImpact": string,
  "suggestedNextAction": string
}

Be decisive and concrete. Use the issue's status and priority as strong signals. Do not add keys. Do not wrap in markdown.`;

export function buildJiraUserPrompt(params: {
  key?: string | null;
  summary: string;
  description: string;
  status?: string;
  priority?: string;
  issueType?: string;
  assignee?: string | null;
}): string {
  return `Key: ${params.key || "(unknown)"}
Type: ${params.issueType || "(unknown)"}
Status: ${params.status || "(unknown)"}
Priority: ${params.priority || "(unknown)"}
Assignee: ${params.assignee || "(unassigned)"}
Summary: ${params.summary || "(no summary)"}

Description:
${(params.description || "(no description)").slice(0, 3500)}`;
}

export type JiraAnalysisResult = {
  summary: string;
  urgency: "urgent" | "reply" | "info" | "low";
  blockerStatus: "blocked" | "blocking" | "none";
  businessImpact: string;
  suggestedNextAction: string;
};