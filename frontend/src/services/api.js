import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export const authAPI = {
  register: (d) => api.post("/api/auth/register", d),
  login: (d) => api.post("/api/auth/login", d),
  me: () => api.get("/api/auth/me"),
  permissions: () => api.get("/api/auth/me/permissions"),
  updateMe: (d) => api.patch("/api/auth/me", d),
  changePassword: (d) => api.post("/api/auth/change-password", d),
};

export const datasetsAPI = {
  list: (p) => api.get("/api/datasets/", { params: p }),
  get: (id) => api.get(`/api/datasets/${id}`),
  preview: (id) => api.get(`/api/datasets/${id}/preview`),
  upload: (fd) => api.post("/api/datasets/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }),
  delete: (id) => api.delete(`/api/datasets/${id}`),
};

export const forecastsAPI = {
  list: (p) => api.get("/api/forecasts/", { params: p }),
  get: (id) => api.get(`/api/forecasts/${id}`),
  create: (d) => api.post("/api/forecasts/", d),
  delete: (id) => api.delete(`/api/forecasts/${id}`),
  models: () => api.get("/api/forecasts/models"),
  compare: (p) => api.post("/api/forecasts/compare", null, { params: p }),
  retrain: (id) => api.post(`/api/forecasts/${id}/retrain`),
  getModels: () => api.get("/api/forecasts/models"),
};

export const dashboardAPI = {
  stats: (p) => api.get("/api/dashboard/stats", { params: p }),
  activity: (p) => api.get("/api/dashboard/activity", { params: p }),
  realtime: () => api.get("/api/dashboard/realtime"),
};

export const reportsAPI = {
  excel: (id) => api.get(`/api/reports/${id}/excel`, { responseType: "blob" }),
  pdf: (id) => api.get(`/api/reports/${id}/pdf`, { responseType: "blob" }),
  insights: (id) => api.get(`/api/reports/${id}/insights`),
};

export const notificationsAPI = {
  list: (p) => api.get("/api/notifications/", { params: p }),
  unreadCount: () => api.get("/api/notifications/unread-count"),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch("/api/notifications/mark-all-read"),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};

export const adminAPI = {
  stats: () => api.get("/api/admin/stats"),
  users: (p) => api.get("/api/admin/users", { params: p }),
  toggleActive: (id) => api.patch(`/api/admin/users/${id}/toggle-active`),
  toggleAdmin: (id) => api.patch(`/api/admin/users/${id}/toggle-admin`),
  updateRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, null, { params: { role } }),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  getRoles: () => api.get("/api/admin/roles"),
  datasets: (p) => api.get("/api/admin/datasets", { params: p }),
  forecasts: (p) => api.get("/api/admin/forecasts", { params: p }),
};

export const analyticsAPI = {
  regionWise: (p) => api.get("/api/analytics/region-wise", { params: p }),
  categoryWise: (p) => api.get("/api/analytics/category-wise", { params: p }),
  revenuePrediction: (p) => api.get("/api/analytics/revenue-prediction", { params: p }),
  inventoryRisk: (p) => api.get("/api/analytics/inventory-risk", { params: p }),
  globalSearch: (q) => api.get("/api/analytics/global-search", { params: { q } }),
};

export const monitoringAPI = {
  activityLogs: (p) => api.get("/api/monitoring/activity-logs", { params: p }),
  userActivity: (id, p) => api.get(`/api/monitoring/user-activity/${id}`, { params: p }),
  performance: (p) => api.get("/api/monitoring/performance", { params: p }),
  forecastHistory: (p) => api.get("/api/monitoring/forecast-history", { params: p }),
};

export const anomalyAPI = {
  detect: (d) => api.post("/api/anomalies/detect", d),
  list: () => api.get("/api/anomalies/"),
  get: (id) => api.get(`/api/anomalies/${id}`),
};

export const scheduleAPI = {
  list: () => api.get("/api/schedules/"),
  get: (id) => api.get(`/api/schedules/${id}`),
  create: (d) => api.post("/api/schedules/", d),
  toggle: (id) => api.patch(`/api/schedules/${id}/toggle`),
  runNow: (id) => api.post(`/api/schedules/${id}/run-now`),
  delete: (id) => api.delete(`/api/schedules/${id}`),
};

export const alertsAPI = {
  listConfigs: () => api.get("/api/alerts/configs"),
  createConfig: (d) => api.post("/api/alerts/configs", d),
  toggleConfig: (id) => api.patch(`/api/alerts/configs/${id}/toggle`),
  deleteConfig: (id) => api.delete(`/api/alerts/configs/${id}`),
  checkAlert: (id) => api.post(`/api/alerts/configs/${id}/check`),
  getLogs: () => api.get("/api/alerts/logs"),
  markLogRead: (id) => api.patch(`/api/alerts/logs/${id}/read`),
};

export const integrationsAPI = {
  list: () => api.get("/api/integrations/"),
  get: (id) => api.get(`/api/integrations/${id}`),
  create: (d) => api.post("/api/integrations/", d),
  toggle: (id) => api.patch(`/api/integrations/${id}/toggle`),
  test: (id) => api.post(`/api/integrations/${id}/test`),
  getLogs: (id) => api.get(`/api/integrations/${id}/logs`),
  delete: (id) => api.delete(`/api/integrations/${id}`),
};

export const aiFeaturesAPI = {
  recommendations: (p) => api.get("/api/ai-features/recommendations", { params: p }),
  buyingBehavior: (p) => api.get("/api/ai-features/buying-behavior", { params: p }),
  demandSpikes: (p) => api.get("/api/ai-features/demand-spikes", { params: p }),
  lowStock: (p) => api.get("/api/ai-features/low-stock", { params: p }),
  eoqOptimization: (p) => api.get("/api/ai-features/eoq-optimization", { params: p }),
};

export const widgetsAPI = {
  list: () => api.get("/api/widgets/"),
  create: (d) => api.post("/api/widgets/", d),
  update: (id, d) => api.patch(`/api/widgets/${id}`, d),
  delete: (id) => api.delete(`/api/widgets/${id}`),
};

export const projectsAPI = {
  list: (p) => api.get("/api/projects/", { params: p }),
  get: (id) => api.get(`/api/projects/${id}`),
  create: (d) => api.post("/api/projects/", d),
  update: (id, d) => api.patch(`/api/projects/${id}`, d),
  delete: (id) => api.delete(`/api/projects/${id}`),
  archive: (id) => api.patch(`/api/projects/${id}/archive`),
  activity: (id) => api.get(`/api/projects/${id}/activity`),
};

export const scenariosAPI = {
  list: () => api.get("/api/scenarios/"),
  get: (id) => api.get(`/api/scenarios/${id}`),
  create: (d) => api.post("/api/scenarios/", d),
  update: (id, d) => api.patch(`/api/scenarios/${id}`, d),
  delete: (id) => api.delete(`/api/scenarios/${id}`),
  compare: (ids) => api.post("/api/scenarios/compare", ids),
};

export const collaborationAPI = {
  getComments: (fid) => api.get(`/api/collaboration/forecasts/${fid}/comments`),
  addComment: (fid, d) => api.post(`/api/collaboration/forecasts/${fid}/comments`, d),
  updateComment: (cid, d) => api.patch(`/api/collaboration/comments/${cid}`, d),
  deleteComment: (cid) => api.delete(`/api/collaboration/comments/${cid}`),
  getRevisions: (fid) => api.get(`/api/collaboration/forecasts/${fid}/revisions`),
  shareReport: (fid, days) => api.post(`/api/collaboration/forecasts/${fid}/share`, null, { params: { expires_days: days } }),
  getShares: (fid) => api.get(`/api/collaboration/forecasts/${fid}/shares`),
  getSharedReport: (token) => api.get(`/api/collaboration/shared/${token}`),
};

export const intelligenceAPI = {
  executiveDashboard: (period) => api.get("/api/intelligence/executive-dashboard", { params: { period } }),
  aiInsights: (datasetId) => api.get("/api/intelligence/ai-insights", { params: { dataset_id: datasetId } }),
  accuracyCenter: () => api.get("/api/intelligence/accuracy-center"),
  generateReport: (p) => api.post("/api/intelligence/executive-reports", null, { params: p }),
  listReports: () => api.get("/api/intelligence/executive-reports"),
  getReport: (id) => api.get(`/api/intelligence/executive-reports/${id}`),
  datasetVersions: (id) => api.get(`/api/intelligence/datasets/${id}/versions`),
};

export const organizationsAPI = {
  list: () => api.get("/api/organizations/"),
  get: (id) => api.get(`/api/organizations/${id}`),
  create: (d) => api.post("/api/organizations/", d),
  update: (id, d) => api.patch(`/api/organizations/${id}`, d),
  delete: (id) => api.delete(`/api/organizations/${id}`),
  listMembers: (id) => api.get(`/api/organizations/${id}/members`),
  addMember: (id, d) => api.post(`/api/organizations/${id}/members`, d),
  updateMemberRole: (oid, uid, role) => api.patch(`/api/organizations/${oid}/members/${uid}`, null, { params: { role } }),
  removeMember: (oid, uid) => api.delete(`/api/organizations/${oid}/members/${uid}`),
};

export const approvalsAPI = {
  list: (p) => api.get("/api/approvals/", { params: p }),
  get: (id) => api.get(`/api/approvals/${id}`),
  submit: (d) => api.post("/api/approvals/submit", d),
  review: (id, d) => api.post(`/api/approvals/${id}/review`, d),
  getHistory: (id) => api.get(`/api/approvals/${id}/history`),
};

export const workflowsAPI = {
  list: () => api.get("/api/workflows/"),
  get: (id) => api.get(`/api/workflows/${id}`),
  create: (d) => api.post("/api/workflows/", d),
  update: (id, d) => api.patch(`/api/workflows/${id}`, d),
  delete: (id) => api.delete(`/api/workflows/${id}`),
  run: (id) => api.post(`/api/workflows/${id}/run`),
  getLogs: (id) => api.get(`/api/workflows/${id}/logs`),
  toggle: (id) => api.patch(`/api/workflows/${id}/toggle`),
};

export const kpisAPI = {
  list: (p) => api.get("/api/kpis/", { params: p }),
  get: (id) => api.get(`/api/kpis/${id}`),
  create: (d) => api.post("/api/kpis/", d),
  update: (id, d) => api.patch(`/api/kpis/${id}`, d),
  delete: (id) => api.delete(`/api/kpis/${id}`),
  getAlerts: () => api.get("/api/kpis/summary/alerts"),
  listTargets: (p) => api.get("/api/kpis/targets", { params: p }),
  createTarget: (d) => api.post("/api/kpis/targets", d),
  updateTarget: (id, d) => api.patch(`/api/kpis/targets/${id}`, d),
  deleteTarget: (id) => api.delete(`/api/kpis/targets/${id}`),
};

export const governanceAPI = {
  dashboard: () => api.get("/api/governance/dashboard"),
  listGovernance: () => api.get("/api/governance/forecasts"),
  createGovernance: (d) => api.post("/api/governance/forecasts", d),
  updateLifecycle: (id, d) => api.patch(`/api/governance/forecasts/${id}/lifecycle`, d),
  runQuality: (did) => api.post(`/api/governance/data-quality/${did}`),
  listQuality: () => api.get("/api/governance/data-quality"),
  listAnnouncements: () => api.get("/api/governance/announcements"),
  createAnnouncement: (d) => api.post("/api/governance/announcements", d),
  deleteAnnouncement: (id) => api.delete(`/api/governance/announcements/${id}`),
};

// Aliases for backward compatibility
export const aiAPI = aiFeaturesAPI;