import { useState, useEffect } from "react";
import { governanceAPI, datasetsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdShield, MdCheckCircle, MdAdd, MdDelete, MdRefresh, MdCampaign, MdClose } from "react-icons/md";
import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";

const LIFECYCLE = ["draft","submitted","approved","published","archived"];
const lcColors = { draft:"badge-info", submitted:"badge-warning", approved:"badge-success", published:"bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 badge", archived:"bg-gray-100 dark:bg-gray-800 text-gray-500 badge" };
const annColors = { info:"border-blue-400 bg-blue-50 dark:bg-blue-900/20", warning:"border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20", success:"border-primary-400 bg-primary-50 dark:bg-primary-900/30", critical:"border-red-400 bg-red-50 dark:bg-red-900/20" };

export default function GovernancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("governance");
  const [govs, setGovs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [qualityReports, setQualityReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title:"", content:"", type:"info" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [gd, gr, qr, ar, dr] = await Promise.all([
        governanceAPI.dashboard(),
        governanceAPI.listGovernance(),
        governanceAPI.listQuality(),
        governanceAPI.listAnnouncements(),
        datasetsAPI.list({ status:"processed" }),
      ]);
      setDashboard(gd.data);
      setGovs(gr.data || []);
      setQualityReports(qr.data || []);
      setAnnouncements(ar.data || []);
      const ds = dr.data?.datasets || dr.data || [];
      setDatasets(Array.isArray(ds) ? ds : []);
    } catch {} finally { setLoading(false); }
  };

  const handleLifecycleChange = async (govId, newStatus) => {
    try {
      const r = await governanceAPI.updateLifecycle(govId, { lifecycle_status: newStatus });
      setGovs((p) => p.map((g) => g.id === govId ? r.data : g));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleRunQuality = async (datasetId) => {
    setRunning(datasetId);
    try {
      const r = await governanceAPI.runQuality(datasetId);
      setQualityReports((p) => [r.data, ...p.filter((q) => q.dataset_id !== datasetId)]);
      toast.success(`Quality score: ${r.data.overall_score}/100`);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setRunning(null); }
  };

  const handleCreateAnn = async (e) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) { toast.error("Fill all fields"); return; }
    setCreating(true);
    try {
      const r = await governanceAPI.createAnnouncement(annForm);
      setAnnouncements((p) => [r.data, ...p]);
      toast.success("Announcement posted!");
      setShowAnnForm(false);
      setAnnForm({ title:"", content:"", type:"info" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleDeleteAnn = async (id) => {
    await governanceAPI.deleteAnnouncement(id);
    setAnnouncements((p) => p.filter((a) => a.id !== id));
    toast.success("Deleted");
  };

  const scoreColor = (s) => s >= 80 ? "text-primary-600" : s >= 60 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="pt-2">
        <h1 className="page-title flex items-center gap-2"><MdShield className="text-primary-500" /> Governance Center</h1>
        <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Forecast lifecycle management, data quality, and organization announcements</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Governed Forecasts", dashboard.total_governed],
            ["Avg Data Quality", dashboard.avg_data_quality ? `${dashboard.avg_data_quality}/100` : "—"],
            ["Quality Reports", dashboard.quality_reports_count],
            ["Lifecycle Stages", Object.keys(dashboard.lifecycle_breakdown || {}).length],
          ].map(([label, val]) => (
            <div key={label} className="stat-card">
              <p className="text-xs text-primary-500 uppercase">{label}</p>
              <p className="font-display text-xl font-bold mt-1" style={{ color:"var(--text)" }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["governance","quality","announcements"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${tab === t ? "bg-primary-600 text-white" : "btn-secondary"}`}>
            {t === "quality" ? "Data Quality" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "governance" && (
        <div className="glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Forecast Lifecycle</h2>
          {loading ? <SkeletonTable rows={4} /> : govs.length === 0 ? (
            <p className="text-sm text-center py-8 text-primary-400">No governed forecasts. Submit a forecast for approval to start governance tracking.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-primary-100 dark:border-primary-800">
                  <th className="table-th">Forecast</th><th className="table-th">Status</th>
                  <th className="table-th">Version</th><th className="table-th">Change Status</th><th className="table-th">Date</th>
                </tr></thead>
                <tbody>
                  {govs.map((g) => (
                    <tr key={g.id} className="border-b border-primary-50 dark:border-primary-900 hover:bg-primary-50/30 dark:hover:bg-primary-900/20">
                      <td className="table-td font-medium">{g.forecast_name || `Forecast #${g.forecast_id}`}</td>
                      <td className="table-td"><span className={lcColors[g.lifecycle_status] || "badge"}>{g.lifecycle_status}</span></td>
                      <td className="table-td text-primary-400">v{g.version}</td>
                      <td className="table-td">
                        <select className="input-field text-xs py-1 w-32" value={g.lifecycle_status}
                          onChange={(e) => handleLifecycleChange(g.id, e.target.value)}>
                          {LIFECYCLE.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="table-td text-xs text-primary-400">{g.created_at?.slice(0,10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "quality" && (
        <div className="space-y-4">
          <div className="glass-card p-4 md:p-5">
            <h2 className="section-title mb-4">Run Data Quality Check</h2>
            <div className="flex gap-2 flex-wrap">
              {datasets.map((d) => (
                <button key={d.id} onClick={() => handleRunQuality(d.id)} disabled={running === d.id}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                  {running === d.id ? <div className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" /> : <MdRefresh className="text-sm" />}
                  {d.name}
                </button>
              ))}
              {datasets.length === 0 && <p className="text-sm text-primary-400">No processed datasets found.</p>}
            </div>
          </div>
          {qualityReports.length > 0 && (
            <div className="space-y-3">
              {qualityReports.map((r) => (
                <div key={r.id} className="glass-card p-4 md:p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>{r.dataset_name}</p>
                      <p className="text-xs text-primary-400">{r.row_count} rows × {r.column_count} cols • {r.created_at?.slice(0,10)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-2xl font-bold ${scoreColor(r.overall_score)}`}>{r.overall_score}</p>
                      <p className="text-xs text-primary-400">/ 100</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[["Completeness", r.completeness_score], ["Consistency", r.consistency_score], ["Validity", r.validity_score]].map(([label, val]) => (
                      <div key={label} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-2 text-center">
                        <p className="text-xs text-primary-400">{label}</p>
                        <p className={`font-bold text-sm ${scoreColor(val)}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {r.issues?.length > 0 && <div className="mb-2"><p className="text-xs font-semibold text-red-500 mb-1">Issues:</p>{r.issues.map((iss, i) => <p key={i} className="text-xs text-red-400">• {iss}</p>)}</div>}
                  {r.recommendations?.length > 0 && <div><p className="text-xs font-semibold text-primary-600 mb-1">Recommendations:</p>{r.recommendations.map((rec, i) => <p key={i} className="text-xs text-primary-500">✓ {rec}</p>)}</div>}
                </div>
              ))}
            </div>
          )}
          {qualityReports.length === 0 && !loading && (
            <div className="glass-card p-8 text-center"><MdShield className="text-4xl text-primary-200 mx-auto mb-3" /><p className="text-sm" style={{ color:"var(--text-muted)" }}>No quality reports yet. Click a dataset above to run analysis.</p></div>
          )}
        </div>
      )}

      {tab === "announcements" && (
        <div className="space-y-4">
          {user?.is_admin && (
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title flex items-center gap-2"><MdCampaign className="text-primary-500" /> Post Announcement</h2>
                <button onClick={() => setShowAnnForm(!showAnnForm)} className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"><MdAdd /> New</button>
              </div>
              {showAnnForm && (
                <form onSubmit={handleCreateAnn} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2"><label className="label">Title *</label><input className="input-field" placeholder="Announcement title" value={annForm.title} onChange={(e) => setAnnForm({...annForm, title:e.target.value})} /></div>
                    <div><label className="label">Type</label><select className="input-field" value={annForm.type} onChange={(e) => setAnnForm({...annForm, type:e.target.value})}><option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="critical">Critical</option></select></div>
                  </div>
                  <div><label className="label">Content *</label><textarea className="input-field resize-none" rows={3} placeholder="Announcement message…" value={annForm.content} onChange={(e) => setAnnForm({...annForm, content:e.target.value})} /></div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={creating} className="btn-primary text-sm px-6">{creating ? "Posting…" : "Post Announcement"}</button>
                    <button type="button" onClick={() => setShowAnnForm(false)} className="btn-secondary text-sm px-4">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}
          {announcements.length === 0 ? (
            <div className="glass-card p-8 text-center"><MdCampaign className="text-4xl text-primary-200 mx-auto mb-3" /><p className="text-sm" style={{ color:"var(--text-muted)" }}>No active announcements.</p></div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className={`glass-card p-4 border-l-4 ${annColors[a.type] || annColors.info}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>{a.title}</p>
                      <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>{a.content}</p>
                      <p className="text-xs text-primary-400 mt-2">{a.created_at?.slice(0,16).replace("T"," ")}</p>
                    </div>
                    {user?.is_admin && (
                      <button onClick={() => handleDeleteAnn(a.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><MdDelete className="text-sm" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
