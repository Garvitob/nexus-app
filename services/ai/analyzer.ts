import { db } from "@/lib/db";
import { completeJSON } from "./client";
import { MODEL_LITE } from "./client";
import {
  EMAIL_SYSTEM_PROMPT,
  buildEmailUserPrompt,
  type EmailAnalysisResult,
} from "./prompts/email";
import {
  MEETING_SYSTEM_PROMPT,
  buildMeetingUserPrompt,
  type MeetingBriefResult,
} from "./prompts/meeting";
import {
  GITHUB_SYSTEM_PROMPT,
  buildGitHubUserPrompt,
  type GitHubAnalysisResult,
} from "./prompts/github";
import {
  JIRA_SYSTEM_PROMPT,
  buildJiraUserPrompt,
  type JiraAnalysisResult,
} from "./prompts/jira";
import { generateAndStoreEmbedding } from "./embeddings";
import { fetchEmailsFromCorsair } from "@/services/sync/gmail.sync";
import { fetchEventsFromCorsair } from "@/services/sync/calendar.sync";
import { fetchPullRequestsFromCorsair, fetchIssuesFromCorsair } from "@/services/sync/github.sync";
import { fetchJiraIssuesFromCorsair } from "@/services/sync/jira.sync";

export async function analyzeEmail(params: {
  userId: string;
  tenantId: string;
  corsairMessageId: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  threadId?: string | null;
  category?: string;
}): Promise<void> {
  const result = await completeJSON<EmailAnalysisResult>({
    model: MODEL_LITE,
    system: EMAIL_SYSTEM_PROMPT,
    user: buildEmailUserPrompt({
      subject: params.subject,
      from: params.from,
      to: params.to,
      body: params.body,
    }),
    maxTokens: 600,
  });

  if (!result.ok) return;

  const d = result.data;

  await db.emailAnalysis.upsert({
    where: {
      userId_corsairMessageId: {
        userId: params.userId,
        corsairMessageId: params.corsairMessageId,
      },
    },
    update: {
      threadId: params.threadId ?? null,
      category: params.category ?? "primary",
      urgency: d.urgency,
      needsReply: d.needsReply,
      isMeetingRequest: d.isMeetingRequest,
      sentiment: d.sentiment,
      summaryShort: d.summaryShort,
      urgencyReason: d.urgencyReason,
      suggestedActions: d.suggestedActions,
      peopleMentioned: d.peopleMentioned,
      deadlineDetected: d.deadlineDetected
        ? new Date(d.deadlineDetected)
        : null,
      confidence: 0.9,
      modelUsed: MODEL_LITE,
      analyzedAt: new Date(),
    },
    create: {
      userId: params.userId,
      corsairMessageId: params.corsairMessageId,
      threadId: params.threadId ?? null,
      category: params.category ?? "primary",
      urgency: d.urgency,
      needsReply: d.needsReply,
      isMeetingRequest: d.isMeetingRequest,
      sentiment: d.sentiment,
      summaryShort: d.summaryShort,
      urgencyReason: d.urgencyReason,
      suggestedActions: d.suggestedActions,
      peopleMentioned: d.peopleMentioned,
      deadlineDetected: d.deadlineDetected
        ? new Date(d.deadlineDetected)
        : null,
      confidence: 0.9,
      modelUsed: MODEL_LITE,
      analyzedAt: new Date(),
    },
  });

  await generateAndStoreEmbedding({
    userId: params.userId,
    itemType: "email",
    itemId: params.corsairMessageId,
    content: `${params.subject} ${params.from} ${params.body}`.slice(0, 6000),
  });
}

export async function analyzeMeeting(params: {
  userId: string;
  tenantId: string;
  corsairEventId: string;
  summary: string;
  description: string;
  attendees: Array<{
    email?: string;
    displayName?: string;
    organizer?: boolean;
  }>;
  organizerEmail?: string | null;
  isOrganizer?: boolean;
  start?: string | null;
}): Promise<void> {
  const result = await completeJSON<MeetingBriefResult>({
    model: MODEL_LITE,
    system: MEETING_SYSTEM_PROMPT,
    user: buildMeetingUserPrompt({
      summary: params.summary,
      description: params.description,
      attendees: params.attendees,
      organizerEmail: params.organizerEmail,
      isOrganizer: params.isOrganizer,
      start: params.start,
    }),
    maxTokens: 800,
  });

  if (!result.ok) return;

  const d = result.data;

  await db.meetingBrief.upsert({
    where: {
      userId_corsairEventId: {
        userId: params.userId,
        corsairEventId: params.corsairEventId,
      },
    },
    update: {
      summary: d.summary,
      mustAttendScore: d.mustAttendScore,
      mustAttendReason: d.mustAttendReason,
      agenda: d.agenda,
      preparationNotes: d.preparationNotes,
      modelUsed: MODEL_LITE,
      generatedAt: new Date(),
    },
    create: {
      userId: params.userId,
      corsairEventId: params.corsairEventId,
      summary: d.summary,
      mustAttendScore: d.mustAttendScore,
      mustAttendReason: d.mustAttendReason,
      agenda: d.agenda,
      preparationNotes: d.preparationNotes,
      modelUsed: MODEL_LITE,
      generatedAt: new Date(),
    },
  });

  await generateAndStoreEmbedding({
    userId: params.userId,
    itemType: "calendar_event",
    itemId: params.corsairEventId,
    content: `${params.summary} ${params.description}`.slice(0, 6000),
  });
}

export async function analyzeGitHubItem(params: {
  userId: string;
  corsairItemId: string;
  itemType: "pull_request" | "issue";
  title: string;
  body: string;
  state?: string;
  repo?: string | null;
  number?: number | null;
}): Promise<void> {
  const result = await completeJSON<GitHubAnalysisResult>({
    model: MODEL_LITE,
    system: GITHUB_SYSTEM_PROMPT,
    user: buildGitHubUserPrompt({
      itemType: params.itemType,
      title: params.title,
      body: params.body,
      state: params.state,
      repo: params.repo,
      number: params.number,
    }),
    maxTokens: 600,
  });

  if (!result.ok) return;

  const d = result.data;

  await db.gitHubAnalysis.upsert({
    where: {
      userId_corsairItemId: {
        userId: params.userId,
        corsairItemId: params.corsairItemId,
      },
    },
    update: {
      itemType: params.itemType,
      summary: d.summary,
      risk: d.risk,
      reviewNeeded: d.reviewNeeded,
      blockers: d.blockers,
      suggestedActions: d.suggestedActions,
      modelUsed: MODEL_LITE,
      analyzedAt: new Date(),
    },
    create: {
      userId: params.userId,
      corsairItemId: params.corsairItemId,
      itemType: params.itemType,
      summary: d.summary,
      risk: d.risk,
      reviewNeeded: d.reviewNeeded,
      blockers: d.blockers,
      suggestedActions: d.suggestedActions,
      modelUsed: MODEL_LITE,
      analyzedAt: new Date(),
    },
  });

  await generateAndStoreEmbedding({
    userId: params.userId,
    itemType: params.itemType === "pull_request" ? "github_pr" : "github_issue",
    itemId: params.corsairItemId,
    content: `${params.title} ${params.body}`.slice(0, 6000),
  });
}

export async function analyzeJiraIssue(params: {
  userId: string;
  corsairIssueId: string;
  key?: string | null;
  summary: string;
  description: string;
  status?: string;
  priority?: string;
  issueType?: string;
  assignee?: string | null;
}): Promise<void> {
  const result = await completeJSON<JiraAnalysisResult>({
    model: MODEL_LITE,
    system: JIRA_SYSTEM_PROMPT,
    user: buildJiraUserPrompt({
      key: params.key,
      summary: params.summary,
      description: params.description,
      status: params.status,
      priority: params.priority,
      issueType: params.issueType,
      assignee: params.assignee,
    }),
    maxTokens: 600,
  });

  if (!result.ok) return;

  const d = result.data;

  await db.jiraAnalysis.upsert({
    where: {
      userId_corsairIssueId: {
        userId: params.userId,
        corsairIssueId: params.corsairIssueId,
      },
    },
    update: {
      summary: d.summary,
      urgency: d.urgency,
      blockerStatus: d.blockerStatus,
      businessImpact: d.businessImpact,
      suggestedNextAction: d.suggestedNextAction,
      modelUsed: MODEL_LITE,
      analyzedAt: new Date(),
    },
    create: {
      userId: params.userId,
      corsairIssueId: params.corsairIssueId,
      summary: d.summary,
      urgency: d.urgency,
      blockerStatus: d.blockerStatus,
      businessImpact: d.businessImpact,
      suggestedNextAction: d.suggestedNextAction,
      modelUsed: MODEL_LITE,
      analyzedAt: new Date(),
    },
  });

  await generateAndStoreEmbedding({
    userId: params.userId,
    itemType: "jira_issue",
    itemId: params.corsairIssueId,
    content: `${params.summary} ${params.description}`.slice(0, 6000),
  });
}

export async function batchAnalyzeForUser(params: {
  userId: string;
  tenantId: string;
}): Promise<void> {
  const { userId, tenantId } = params;

  const unanalyzedEmails = await db.emailAnalysis.findMany({
    where: { userId, urgency: null },
    select: { corsairMessageId: true, threadId: true, category: true },
    take: 20,
  });

  if (unanalyzedEmails.length > 0) {
    const emails = await fetchEmailsFromCorsair(tenantId, 50);
    const emailMap = new Map(emails.map((e) => [e.corsairMessageId, e]));

    for (const row of unanalyzedEmails) {
      const email = emailMap.get(row.corsairMessageId);
      if (!email) continue;
      await analyzeEmail({
        userId,
        tenantId,
        corsairMessageId: email.corsairMessageId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        body: email.body,
        threadId: email.threadId,
        category: row.category ?? "primary",
      });
    }
  }

  const unanalyzedMeetings = await db.meetingBrief.findMany({
    where: { userId, summary: null },
    select: { corsairEventId: true },
    take: 10,
  });

  if (unanalyzedMeetings.length > 0) {
    const events = await fetchEventsFromCorsair(tenantId, 100);
    const eventMap = new Map(events.map((e) => [e.corsairEventId, e]));

    for (const row of unanalyzedMeetings) {
      const event = eventMap.get(row.corsairEventId);
      if (!event) continue;
      await analyzeMeeting({
        userId,
        tenantId,
        corsairEventId: event.corsairEventId,
        summary: event.summary,
        description: event.description,
        attendees: event.attendees,
        organizerEmail: event.organizerEmail,
        isOrganizer: event.isOrganizer,
        start: event.start?.toISOString() ?? null,
      });
    }
  }

  const unanalyzedGitHub = await db.gitHubAnalysis.findMany({
    where: { userId, summary: null },
    select: { corsairItemId: true, itemType: true },
    take: 20,
  });

  if (unanalyzedGitHub.length > 0) {
    const [prs, issues] = await Promise.all([
      fetchPullRequestsFromCorsair(tenantId, 50),
      fetchIssuesFromCorsair(tenantId, 50),
    ]);
    const ghMap = new Map(
      [...prs, ...issues].map((i) => [i.corsairItemId, i])
    );

    for (const row of unanalyzedGitHub) {
      const item = ghMap.get(row.corsairItemId);
      if (!item) continue;
      await analyzeGitHubItem({
        userId,
        corsairItemId: item.corsairItemId,
        itemType: item.itemType,
        title: item.title,
        body: item.body,
        state: item.state,
        repo: item.repo,
        number: item.number,
      });
    }
  }

  const unanalyzedJira = await db.jiraAnalysis.findMany({
    where: { userId, summary: null },
    select: { corsairIssueId: true },
    take: 20,
  });

  if (unanalyzedJira.length > 0) {
    const issues = await fetchJiraIssuesFromCorsair(tenantId, 50);
    const jiraMap = new Map(issues.map((i) => [i.corsairIssueId, i]));

    for (const row of unanalyzedJira) {
      const issue = jiraMap.get(row.corsairIssueId);
      if (!issue) continue;
      await analyzeJiraIssue({
        userId,
        corsairIssueId: issue.corsairIssueId,
        key: issue.key,
        summary: issue.summary,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        issueType: issue.issueType,
        assignee: issue.assignee,
      });
    }
  }
}