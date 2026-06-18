gmail.db.messages.search
path: gmail.db.messages.search

filters {
  entity_id: string  [equals, contains, startsWith, endsWith, in]
  id: string  [equals, contains, startsWith, endsWith, in]
  threadId: string  [equals, contains, startsWith, endsWith, in]
  snippet: string  [equals, contains, startsWith, endsWith, in]
  historyId: string  [equals, contains, startsWith, endsWith, in]
  internalDate: string  [equals, contains, startsWith, endsWith, in]
  sizeEstimate: number  [equals, gt, gte, lt, lte, in]
  raw: string  [equals, contains, startsWith, endsWith, in]
  subject: string  [equals, contains, startsWith, endsWith, in]
  body: string  [equals, contains, startsWith, endsWith, in]
  from: string  [equals, contains, startsWith, endsWith, in]
  to: string  [equals, contains, startsWith, endsWith, in]
  createdAt: date  [equals, before, after, between]
}
input {}
output {}
