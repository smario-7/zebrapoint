import { api } from "./client";

export const postsApi = {
  list: () => api.get("/api/v2/posts"),
  get: (id) => api.get(`/api/v2/posts/${id}`),
  detail: (id) => api.get(`/api/v2/posts/${id}/detail`),
  create: (data) => api.post("/api/v2/posts", data),
  update: (id, data) => api.patch(`/api/v2/posts/${id}`, data),
  publish: (id) => api.post(`/api/v2/posts/${id}/publish`),
  delete: (id) => api.delete(`/api/v2/posts/${id}`),
  lensMatches: (id) => api.get(`/api/v2/posts/${id}/lens-matches`),

  addComment: (postId, content) => api.post(`/api/v2/posts/${postId}/comments`, { content }),
  addReply: (commentId, content) =>
    api.post(`/api/v2/comments/${commentId}/replies`, { content }),
  deleteComment: (id) => api.delete(`/api/v2/comments/${id}`),

  togglePostReaction: (postId, reaction) =>
    api.post(`/api/v2/posts/${postId}/reactions`, { reaction }),
  toggleCommentReaction: (commentId, reaction) =>
    api.post(`/api/v2/comments/${commentId}/reactions`, { reaction }),

  createProposal: (data) => api.post("/api/v2/lens-proposals", data),
  myProposals: () => api.get("/api/v2/lens-proposals/my"),
};
