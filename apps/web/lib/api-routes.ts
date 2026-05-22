export const API_BASE_URL = "/api"
export const DOCUMENTS_BASE_URL = `${API_BASE_URL}/documents`
export const COMMENTS_BASE_URL = `${API_BASE_URL}/comments`

export const API_ROUTES = {
  documents: {
    create: DOCUMENTS_BASE_URL,
    join: `${DOCUMENTS_BASE_URL}/join`,
    get: (id: string) => `${DOCUMENTS_BASE_URL}/${id}`,
    invite: `${DOCUMENTS_BASE_URL}/invite`,
    updateRole: `${DOCUMENTS_BASE_URL}/role`,
    updateTitle: `${DOCUMENTS_BASE_URL}/title`
  },
  comments: {
    list: (documentId: string) => `${COMMENTS_BASE_URL}/${documentId}`,
    create: COMMENTS_BASE_URL,
    reply: `${COMMENTS_BASE_URL}/reply`,
    resolve: `${COMMENTS_BASE_URL}/resolve`
  }
} as const
