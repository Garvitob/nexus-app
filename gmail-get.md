Get a specific message  [read]

input {
  userId?: string
  id: string
  format?: minimal | full | raw | metadata
  metadataHeaders?: string[]
}
output {
  id?: string
  threadId?: string
  labelIds?: string[]
  snippet?: string
  historyId?: string
  internalDate?: string | number | Date
  sizeEstimate?: number
  payload?: { partId?: string, mimeType?: string, filename?: string, headers?: { name?: string, value?: string }[], body?: { attachmentId?: string, size?: number, data?: string }, parts: lazy }
  raw?: string  // Full RFC 2822 message in base64url encoding (when format=raw). Not plain text — decode base64url before reading headers/body.
}
