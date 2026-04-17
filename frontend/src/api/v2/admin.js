import { api } from "./client";

function queryString(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const adminApi = {
  stats: () => api.get("/api/v2/admin/stats"),

  users: (params = {}) => api.get(`/api/v2/admin/users${queryString(params)}`),
  banUser: (userId, banned, reason) =>
    api.patch(`/api/v2/admin/users/${userId}/ban`, { banned, reason: reason || null }),
  setUserRole: (userId, role) => api.patch(`/api/v2/admin/users/${userId}/role`, { role }),

  posts: (params = {}) => api.get(`/api/v2/admin/posts${queryString(params)}`),
  deletePost: (postId) => api.delete(`/api/v2/admin/posts/${postId}`),

  lenses: (params = {}) => api.get(`/api/v2/admin/lenses${queryString(params)}`),
  createLens: (body) => api.post("/api/v2/admin/lenses", body),
  updateLens: (lensId, body) => api.patch(`/api/v2/admin/lenses/${lensId}`, body),
  toggleLens: (lensId) => api.patch(`/api/v2/admin/lenses/${lensId}/toggle`),

  orphanetSearch: (q) =>
    api.get(`/api/v2/admin/orphanet/search?q=${encodeURIComponent(q)}`),
  orphanetImport: (orphaId) => api.post("/api/v2/admin/orphanet/import", { orpha_id: orphaId }),

  proposals: (params = {}) => api.get(`/api/v2/admin/lens-proposals${queryString(params)}`),
  approveProposal: (proposalId) => api.post(`/api/v2/admin/lens-proposals/${proposalId}/approve`),
  rejectProposal: (proposalId, comment) =>
    api.post(`/api/v2/admin/lens-proposals/${proposalId}/reject`, { comment }),
};
