import { api } from "./client";

export const topicsApi = {
  list: () => api.get("/api/v2/topics"),
  invitations: () => api.get("/api/v2/topics/invitations"),
};
