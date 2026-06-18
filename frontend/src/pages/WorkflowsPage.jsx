import { useState, useEffect } from "react";
import { workflowsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdAccountTree, MdAdd, MdDelete, MdPlayArrow, MdPause, MdList, MdClose, MdCheckCircle, MdError } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

const TRIGGERS = ["manual","schedule","event"];
const ACTION_TYPES = ["generate_forecast","generate_report","send_notification","run_anomaly_detection","update_dashboard"];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: "manual", actions: [] });
  const [newAction, setNewAction] = useState("generate_forecast");

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try { const r = await workflowsAPI.list(); setWorkflows(r.data || []); }
    catch {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      const r = await workflowsAPI.create(form);
      setWorkflows((p) => [r.data, ...p]);
      toast.success("Workflow created!");
      setShowForm(false);
      setForm({ name: "", description: "", trigger: "manual", actions: [] });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleRun = async (id) => {
    setRunning(id);
    try {
      const r = await workflowsAPI.run(id);
      toast.success(r.data.status === "success" ? "Workflow executed!" : "Workflow failed");
      fetchWorkflows();
      if (selected?.id === id) {
        const lr = await workflowsAPI.getLogs(id);
        setLogs(lr.data || []);
      }
    } catch (err) { toast.error(err.response?.data?.detail || "Run failed"); }
    finally { setRunning(null); }
  };

  const handleToggle = async (id) => {
    const r = await workflowsAPI.toggle(id);
    setWorkflows((p) => p.map((w) => w.id === id ? { ...w, is_active: r.data.is_active } : w));
    toast.success(r.data.message);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete workflow?")) return;
    await workflowsAPI.delete(id);
    setWorkflows((p) => p.filter((w) => w.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted");
  };

  const handleSelect = async (wf) => {
    setSelected(wf);
    try { const r = await workflowsAPI.getLogs(wf.id); setLogs(r.data || []); }
    catch { setLogs([]); }
  };

  const addAction = () => {
    setForm((f) => ({ ...f, actions: [...(f.actions || []), { type: newAction, config: {} }] }));
  };

  const removeAction = (i) => setForm((f) => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="page-title flex items-center gap-2"><MdAccountTree className="text-primary-500" /> Workflow Automation</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Configure and automate forecast and report generation workflows</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2 flex-shrink-0">
          <MdAdd /><span className="hidden sm:inline">New Workflow</span>
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Configure Workflow</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Workflow Name *</label>
                <input className="input-field" placeholder="e.g. Daily Forecast Pipeline" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Trigger</label>
                <select className="input-field" value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
                  {TRIGGERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <input className="input-field" placeholder="What does this workflow do?"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label mb-2">Actions</label>
              <div className="flex gap-2 mb-2">
                <select className="input-field text-sm flex-1" value={newAction} onChange={(e) => setNewAction(e.target.value)}>
                  {ACTION_TYPES.map((a) => <option key={a} value={a}>{a.replace(/_/g," ")}</option>)}
                </select>
                <button type="button" onClick={addAction} className="btn-secondary text-xs px-4">Add</button>
              </div>
              {form.actions?.length > 0 && (
                <div className="space-y-1.5">
                  {form.actions.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/40 rounded-xl">
                      <span className="text-xs font-medium text-primary-600">Step {i+1}: {a.type.replace(/_/g," ")}</span>
                      <button type="button" onClick={() => removeAction(i)} className="text-red-400 hover:text-red-600"><MdClose className="text-sm" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
              {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {creating ? "Creating…" : "Create Workflow"}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 space-y-3">
          <h2 className="section-title">Workflows</h2>
          {loading ? <SkeletonTable rows={3} /> : workflows.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <MdAccountTree className="text-4xl text-primary-200 mx-auto mb-3" />
              <p className="text-sm" style={{ color:"var(--text-muted)" }}>No workflows yet.</p>
            </div>
          ) : workflows.map((wf) => (
            <div key={wf.id} onClick={() => handleSelect(wf)}
              className={`glass-card p-4 cursor-pointer transition-all hover:border-primary-400 ${selected?.id === wf.id ? "border-primary-400 shadow-green-glow" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>{wf.name}</p>
                    <span className={wf.is_active ? "badge-success" : "badge-warning"}>{wf.is_active ? "Active" : "Paused"}</span>
                    <span className="badge-info capitalize">{wf.trigger}</span>
                  </div>
                  {wf.description && <p className="text-xs text-primary-400 truncate">{wf.description}</p>}
                  <div className="flex gap-3 mt-1.5 text-xs text-primary-400">
                    <span>{wf.actions?.length || 0} actions</span>
                    <span>Run {wf.run_count || 0} times</span>
                    {wf.last_run_at && <span>Last: {wf.last_run_at?.slice(0,10)}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleRun(wf.id)} disabled={running === wf.id || !wf.is_active}
                    className="text-primary-500 hover:text-primary-700 p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/50 rounded-lg transition-all" title="Run now">
                    {running === wf.id ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" /> : <MdPlayArrow className="text-lg" />}
                  </button>
                  <button onClick={() => handleToggle(wf.id)} className="text-primary-400 hover:text-primary-600 p-1.5 rounded-lg" title={wf.is_active ? "Pause" : "Activate"}>
                    <MdPause className="text-base" />
                  </button>
                  <button onClick={() => handleDelete(wf.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg">
                    <MdDelete className="text-base" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2 glass-card p-4 md:p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><MdList className="text-primary-500" /> Execution Logs</h2>
          {selected ? (
            logs.length === 0 ? (
              <p className="text-sm text-primary-400 text-center py-8">No logs yet. Click ▶ to run.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {logs.map((l) => (
                  <div key={l.id} className={`p-3 rounded-xl border-l-4 text-xs
                    ${l.status === "success" ? "border-primary-400 bg-primary-50 dark:bg-primary-900/40"
                    : l.status === "failed" ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                    : "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {l.status === "success" ? <MdCheckCircle className="text-primary-500" />
                        : l.status === "failed" ? <MdError className="text-red-500" />
                        : <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />}
                      <span className="font-medium capitalize" style={{ color:"var(--text)" }}>{l.status}</span>
                      <span className="text-primary-400 ml-auto">{l.started_at?.slice(0,16).replace("T"," ")}</span>
                    </div>
                    {l.output && <p className="text-primary-600 dark:text-primary-400 whitespace-pre-line">{l.output}</p>}
                    {l.error && <p className="text-red-500">{l.error}</p>}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-primary-300">
              <MdAccountTree className="text-5xl mb-3" />
              <p className="text-sm">Select a workflow to view logs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
