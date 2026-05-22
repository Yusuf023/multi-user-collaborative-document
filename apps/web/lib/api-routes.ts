export const API_ROUTES = {
  documents: {
    create: "/api/documents",
    join: "/api/documents/join",
    get: (id: string) => `/api/documents/${id}`,
    invite: "/api/documents/invite",
    updateRole: "/api/documents/role"
  },
  comments: {
    list: (documentId: string) => `/api/comments/${documentId}`,
    create: "/api/comments",
    reply: "/api/comments/reply",
    resolve: "/api/comments/resolve"
  }
} as const
