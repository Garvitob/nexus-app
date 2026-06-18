export const GITHUB_SYSTEM_PROMPT = `You are the engineering triage engine for a professional work assistant.
You read one GitHub pull request or issue and return a strict JSON object.

You produce:
- summary: 1-2 sentences in plain language describing what this PR or issue is about. Avoid jargon where possible.
- risk: one of "low", "medium", "high". For a PR: how risky is merging it (size, scope, area touched, whether it looks tested). For an issue: how damaging is the problem it describes.
- reviewNeeded: true if this item appears to need the user's review or action.
- blockers: array of 0-3 short strings describing what is blocking progress, if anything is implied (e.g. "Waiting on review", "Failing checks", "Open questions in discussion"). Empty array if none apparent.
- suggestedActions: array of 0-3 short action strings (e.g. "Review and approve", "Respond to open question", "Triage and assign").

Return ONLY a JSON object with exactly these keys:
{
  "summary": string,
  "risk": "low" | "medium" | "high",
  "reviewNeeded": boolean,
  "blockers": string[],
  "suggestedActions": string[]
}

Be decisive and concrete. Do not add keys. Do not wrap in markdown.`;

export function buildGitHubUserPrompt(params: {
  itemType: "pull_request" | "issue";
  title: string;
  body: string;
  state?: string;
  repo?: string | null;
  number?: number | null;
}): string {
  const label = params.itemType === "pull_request" ? "Pull Request" : "Issue";
  return `Type: ${label}
Repository: ${params.repo || "(unknown)"}
Number: ${params.number ?? "(unknown)"}
State: ${params.state || "(unknown)"}
Title: ${params.title || "(no title)"}

Description:
${(params.body || "(no description)").slice(0, 3500)}`;
}

export type GitHubAnalysisResult = {
  summary: string;
  risk: "low" | "medium" | "high";
  reviewNeeded: boolean;
  blockers: string[];
  suggestedActions: string[];
};