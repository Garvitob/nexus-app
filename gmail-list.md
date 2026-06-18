List messages in a mailbox  [read]

input {
  userId?: string
  q?: string
  maxResults?: number
  pageToken?: string
  labelIds?: string[]
  includeSpamTrash?: boolean
}
output {
  messages?: { id?: string, threadId?: string, labelIds?: string[], snippet?: string, historyId?: string, internalDate?: string | number | Date | null, sizeEstimate?: number, payload?: { partId?: string, mimeType?: string, filename?: string, headers?: { name?: string, value?: string }[], body?: { attachmentId?: string, size?: number, data?: string }, parts: lazy }, raw?: string }[]
  nextPageToken?: string
  resultSizeEstimate?: number
}
