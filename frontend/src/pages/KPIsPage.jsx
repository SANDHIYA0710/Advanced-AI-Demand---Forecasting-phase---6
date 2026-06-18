import { useState, useEffect } from "react";
import { kpisAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdLeaderboard, MdAdd, MdDelete, MdEdit, MdClose, MdWarning, MdFlag } from "react-icons/md";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SkeletonCard, SkeletonChart } from "../components/ui/Skeleton";

export default function KPIsPage() {
  const [kpis, setKpis] = useState([]);
  const [targets, setTargets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("kpis");
  const [showKpiForm, setShowKpiForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [kpiForm, setKpiForm] = useState({ name:"", category:"", unit:"", target_value:"", current_value:"", alert_threshold:"", alert_operator:"<" });
  const [targetForm, setTargetForm] = useState({ name:"", period_type:"annual", period_label:"", target_revenue:"", target_units:"", target_growth_pct:"", actual_revenue:"", actual_units:"" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [kr, tr, ar] = await Promise.all([kpisAPI.list(), kpisAPI.listTargets(), kpisAPI.getAlerts()]);
      setKpis(kr.data || []);
      setTargets(tr.data || []);
      setAlerts(ar.data?.alerts || []);
    } catch {} finally { setLoading(false); }
  };

  const handleCreateKpi = async (e) => {
    e.preventDefault();
    if (!kpiForm.name) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      const payload = { ...kpiForm, target_value: kpiForm.target_value ? parseFloat(kpiForm.target_value) : null, current_value: kpiForm.current_value ? parseFloat(kpiForm.current_value) : null, alert_threshold: kpiForm.alert_threshold ? parseFloat(kpiForm.alert_threshold) : null };
      const r = await kpisAPI.create(payload);
      setKpis((p) => [r.data, ...p]);
      toast.success("KPI created!");
      setShowKpiForm(false);
      setKpiForm({ name:"", category:"", unit:"", target_value:"", current_value:"", alert_threshold:"", alert_operator:"<" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleCreateTarget = async (e) => {
    e.preventDefault();
    if (!targetForm.name) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      const payload = Object.fromEntries(Object.entries(targetForm).map(([k,v]) => [k, ["target_revenue","target_units","target_growth_pct","actual_revenue","actual_units"].includes(k) && v !== "" ? parseFloat(v) : v || null]));
      const r = await kpisAPI.createTarget(payload);
      setTargets((p) => [r.data, ...p]);
      toast.success("Target created!");
      setShowTargetForm(false);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleDeleteKpi = async (id) => {
    await kpisAPI.delete(id);
    setKpis((p) => p.filter((k) => k.id !== id));
    toast.success("KPI deleted");
  };

  const handleDeleteTarget = async (id) => {
    await kpisAPI.deleteTarget(id);
    setTargets((p) => p.filter((t) => t.id !== id));
    toast.success("Target deleted");
  };

  const progressColor = (pct) => pct >= 100 ? "#f97316" : pct >= 70 ? "#16a34a" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="page-title flex items-center gap-2"><MdLeaderboard className="text-primary-500" /> KPI Management</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Track performance indicators and strategic targets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowKpiForm(!showKpiForm); setShowTargetForm(false); }} className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"><MdAdd /> KPI</button>
          <button onClick={() => { setShowTargetForm(!showTargetForm); setShowKpiForm(false); }} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"><MdFlag /> Target</button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-2"><MdWarning /> {alerts.length} KPI Alert{alerts.length > 1 ? "s" : ""}</p>
          <div className="space-y-1">
            {alerts.map((a, i) => <p key={i} className="text-xs text-yellow-600 dark:text-yellow-300">{a.name}: {a.current_value}{a.unit} {a.operator} {a.threshold}{a.unit} threshold</p>)}
          </div>
        </div>
      )}

      {showKpiForm && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Create KPI</h2>
            <button onClick={() => setShowKpiForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreateKpi} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3"><label className="label">KPI Name *</label><input className="input-field" placeholder="e.g. Monthly Revenue Growth" value={kpiForm.name} onChange={(e) => setKpiForm({...kpiForm, name:e.target.value})} /></div>
            <div><label className="label">Category</label><input className="input-field text-sm" placeholder="Sales" value={kpiForm.category} onChange={(e) => setKpiForm({...kpiForm, category:e.target.value})} /></div>
            <div><label className="label">Unit</label><input className="input-field text-sm" placeholder="% or $" value={kpiForm.unit} onChange={(e) => setKpiForm({...kpiForm, unit:e.target.value})} /></div>
            <div><label className="label">Target Value</label><input type="number" className="input-field text-sm" placeholder="100" value={kpiForm.target_value} onChange={(e) => setKpiForm({...kpiForm, target_value:e.target.value})} /></div>
            <div><label className="label">Current Value</label><input type="number" className="input-field text-sm" placeholder="75" value={kpiForm.current_value} onChange={(e) => setKpiForm({...kpiForm, current_value:e.target.value})} /></div>
            <div><label className="label">Alert Threshold</label><input type="number" className="input-field text-sm" placeholder="50" value={kpiForm.alert_threshold} onChange={(e) => setKpiForm({...kpiForm, alert_threshold:e.target.value})} /></div>
            <div><label className="label">Alert If</label><select className="input-field text-sm" value={kpiForm.alert_operator} onChange={(e) => setKpiForm({...kpiForm, alert_operator:e.target.value})}><option value="<">Below (&lt;)</option><option value=">">Above (&gt;)</option></select></div>
            <div className="col-span-2 sm:col-span-3"><button type="submit" disabled={creating} className="btn-primary text-sm px-6">{creating ? "Creating…" : "Create KPI"}</button></div>
          </form>
        </div>
      )}

      {showTargetForm && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Create Strategic Target</h2>
            <button onClick={() => setShowTargetForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreateTarget} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3"><label className="label">Target Name *</label><input className="input-field" placeholder="e.g. 2024 Annual Revenue Goal" value={targetForm.name} onChange={(e) => setTargetForm({...targetForm, name:e.target.value})} /></div>
            <div><label className="label">Period Type</label><select className="input-field text-sm" value={targetForm.period_type} onChange={(e) => setTargetForm({...targetForm, period_type:e.target.value})}><option value="annual">Annual</option><option value="quarterly">Quarterly</option><option value="monthly">Monthly</option></select></div>
            <div><label className="label">Period Label</label><input className="input-field text-sm" placeholder="2024 or Q1-2024" value={targetForm.period_label} onChange={(e) => setTargetForm({...targetForm, period_label:e.target.value})} /></div>
            <div><label className="label">Target Revenue</label><input type="number" className="input-field text-sm" placeholder="1000000" value={targetForm.target_revenue} onChange={(e) => setTargetForm({...targetForm, target_revenue:e.target.value})} /></div>
            <div><label className="label">Actual Revenue</label><input type="number" className="input-field text-sm" placeholder="750000" value={targetForm.actual_revenue} onChange={(e) => setTargetForm({...targetForm, actual_revenue:e.target.value})} /></div>
            <div><label className="label">Target Growth %</label><input type="number" className="input-field text-sm" placeholder="15" value={targetForm.target_growth_pct} onChange={(e) => setTargetForm({...targetForm, target_growth_pct:e.target.value})} /></div>
            <div className="col-span-2 sm:col-span-3"><button type="submit" disabled={creating} className="btn-primary text-sm px-6">{creating ? "Creating…" : "Create Target"}</button></div>
          </form>
        </div>
      )}

      <div className="flex gap-2">
        {["kpis","targets"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${tab === t ? "bg-primary-600 text-white" : "btn-secondary"}`}>
            {t === "kpis" ? "KPIs" : "Strategic Targets"}
          </button>
        ))}
      </div>

      {tab === "kpis" && (
        <>
          {loading ? <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div> :
          kpis.length === 0 ? (
            <div className="glass-card p-8 text-center"><MdLeaderboard className="text-4xl text-primary-200 mx-auto mb-3" /><p className="text-sm" style={{color:"var(--text-muted)"}}>No KPIs yet. Create your first KPI above.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kpis.map((k) => (
                <div key={k.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div><p className="font-semibold text-sm" style={{color:"var(--text)"}}>{k.name}</p>{k.category && <p className="text-xs text-primary-400">{k.category}</p>}</div>
                    <button onClick={() => handleDeleteKpi(k.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><MdDelete className="text-sm" /></button>
                  </div>
                  {k.current_value !== null && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-primary-400">Current</span>
                        <span className="font-bold" style={{color:"var(--text)"}}>{k.current_value}{k.unit}</span>
                      </div>
                      {k.target_value && (
                        <>
                          <div className="h-2 bg-primary-100 dark:bg-primary-900 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${Math.min(k.progress_pct || 0, 100)}%`, backgroundColor: progressColor(k.progress_pct || 0)}} />
                          </div>
                          <div className="flex justify-between text-[10px] text-primary-400 mt-0.5">
                            <span>0</span><span>Target: {k.target_value}{k.unit}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {k.alert_threshold && <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠ Alert if {k.alert_operator} {k.alert_threshold}{k.unit}</p>}
                </div>
              ))}
            </div>
          )}
          {kpis.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <h2 className="section-title mb-4">KPI Progress Chart</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={kpis.filter(k => k.progress_pct !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,239,172,0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} unit="%" domain={[0,120]} />
                  <Tooltip formatter={(v) => [`${v}%`, "Progress"]} />
                  <Bar dataKey="progress_pct" name="Progress %" radius={[4,4,0,0]}>
                    {kpis.filter(k => k.progress_pct !== null).map((k, i) => <Cell key={i} fill={progressColor(k.progress_pct || 0)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {tab === "targets" && (
        loading ? <SkeletonChart /> : targets.length === 0 ? (
          <div className="glass-card p-8 text-center"><MdFlag className="text-4xl text-primary-200 mx-auto mb-3" /><p className="text-sm" style={{color:"var(--text-muted)"}}>No strategic targets yet.</p></div>
        ) : (
          <div className="space-y-3">
            {targets.map((t) => (
              <div key={t.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div><p className="font-semibold text-sm" style={{color:"var(--text)"}}>{t.name}</p><p className="text-xs text-primary-400">{t.period_type} {t.period_label && `— ${t.period_label}`}</p></div>
                  <button onClick={() => handleDeleteTarget(t.id)} className="text-red-400 hover:text-red-600"><MdDelete className="text-sm" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[["Target Revenue", t.target_revenue, "$"], ["Actual Revenue", t.actual_revenue, "$"], ["Target Growth", t.target_growth_pct, "%"], ["Progress", t.revenue_progress_pct, "%"]].map(([label, val, unit]) => val !== null && val !== undefined && (
                    <div key={label} className="bg-primary-50 dark:bg-primary-900/40 rounded-xl p-3">
                      <p className="text-xs text-primary-400">{label}</p>
                      <p className="font-bold text-sm mt-0.5" style={{color:"var(--text)"}}>{unit === "$" ? `$${parseFloat(val).toLocaleString()}` : `${val}${unit}`}</p>
                    </div>
                  ))}
                </div>
                {t.revenue_progress_pct !== null && (
                  <div className="mt-3">
                    <div className="h-2 bg-primary-100 dark:bg-primary-900 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${Math.min(t.revenue_progress_pct, 100)}%`, backgroundColor: progressColor(t.revenue_progress_pct)}} />
                    </div>
                    <p className="text-xs text-primary-400 mt-1">{t.revenue_progress_pct}% of revenue target achieved</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
