import { api } from "./client";

export const lensesApi = {
  list: (filter = "all", limit = 50, offset = 0) =>
    api.get(`/api/v2/lenses?filter=${encodeURIComponent(filter)}&limit=${limit}&offset=${offset}`),

  get: (id) => api.get(`/api/v2/lenses/${id}`),

  getPosts: (id, limit = 20, offset = 0) =>
    api.get(`/api/v2/lenses/${id}/posts?limit=${limit}&offset=${offset}`),
};
