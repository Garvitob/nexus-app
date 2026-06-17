
export const APP_NAME = "Nexus";


export const PLUGINS = {
  GMAIL: "gmail",
  CALENDAR: "googlecalendar",
  GITHUB: "github",
  JIRA: "jira",
  NOTION: "notion",
} as const;

export type PluginId = (typeof PLUGINS)[keyof typeof PLUGINS];

export type AuthType = "oauth_2" | "api_key";

export interface PluginMeta {
  label: string;
  description: string;
  authType: AuthType;
}

// Display metadata for the Connect Apps page and Settings
export const PLUGIN_META: Record<PluginId, PluginMeta> = {
  gmail: {
    label: "Gmail",
    description: "Read, search, draft, and send email.",
    authType: "oauth_2",
  },
  googlecalendar: {
    label: "Google Calendar",
    description: "Manage events, availability, and invites.",
    authType: "oauth_2",
  },
  github: {
    label: "GitHub",
    description: "Track pull requests, issues, and reviews.",
    authType: "api_key",
  },
  jira: {
    label: "Jira",
    description: "Monitor issues, sprints, and blockers.",
    authType: "api_key",
  },
  notion: {
    label: "Notion",
    description: "Search and reference your workspace docs.",
    authType: "api_key",
  },
};

export const ALL_PLUGIN_IDS: PluginId[] = [
  PLUGINS.GMAIL,
  PLUGINS.CALENDAR,
  PLUGINS.GITHUB,
  PLUGINS.JIRA,
  PLUGINS.NOTION,
];


export const AI_MODELS = {
  STRONG: process.env.OPENAI_MODEL_STRONG ?? "gpt-5.5",
  LITE: process.env.OPENAI_MODEL_LITE ?? "gpt-5.4-mini",
  EMBEDDING: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
} as const;


export const ROUTES = {
  LANDING: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  CONNECT: "/connect",
  NEXUS: "/nexus",
  INBOX: "/inbox",
  TODO: "/todo",
  MEETINGS: "/meetings",
  SETTINGS: "/settings",
} as const;

export const EMAIL_CATEGORIES = {
  PRIMARY: "primary",
  PROMOTIONS: "promotions",
  SPAM: "spam",
  ALL: "all",
} as const;

export type EmailCategory =
  (typeof EMAIL_CATEGORIES)[keyof typeof EMAIL_CATEGORIES];


export const URGENCY = {
  URGENT: "urgent",
  REPLY: "reply",
  INFO: "info",
  LOW: "low",
} as const;

export type Urgency = (typeof URGENCY)[keyof typeof URGENCY];

export const URGENCY_COLOR: Record<Urgency, string> = {
  urgent: "#ef4444",
  reply: "#eab308",
  info: "#22c55e",
  low: "#3b82f6",
};


export const TASK_SOURCE = {
  MANUAL: "manual",
  AI: "ai",
  EMAIL: "email",
  CALENDAR: "calendar",
  GITHUB: "github",
  JIRA: "jira",
  NOTION: "notion",
} as const;

export type TaskSource = (typeof TASK_SOURCE)[keyof typeof TASK_SOURCE];


export const LIMITS = {
  INITIAL_EMAIL_LOAD: 50,
  EMAIL_BATCH: 20,
  MAX_AI_CONTEXT_EMAILS: 25,
} as const;