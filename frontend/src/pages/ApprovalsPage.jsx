import { useState, useEffect } from "react";
import { approvalsAPI, forecastsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdGavel, MdCheckCircle, MdCancel, MdPending, MdHistory, MdSend } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";

const statusConfig = {
  pending:  { badge: "badge-warning", icon: MdPending },
  approved: { badge: "badge-success", icon: MdCheckCircle },
  rejected: { badge: "badge-error",   icon: MdCancel },
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitForm, setSubmitForm] = useState({ forecast_id: "", comments: "" });
  const [reviewForm, setReviewForm] = useState({ action: "approve", comments: "", rejection_reason: "" });
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => { fetchAll(); }, [filterStatus]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ar, fr] = await Promise.all([
        approvalsAPI.list({ status: filterStatus || undefined }),
        forecastsAPI.list({ status: "completed" }),
      ]);
      setApprovals(ar.data || []);
      const fdata = fr.data?.forecasts || fr.data || [];
      setForecasts(Array.isArray(fdata) ? fdata : []);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submitForm.forecast_id) { toast.error("Select a forecast"); return; }
    setSubmitting(true);
    try {
      const r = await approvalsAPI.submit({ forecast_id: parseInt(submitForm.forecast_id), comments: submitForm.comments });
      setApprovals((p) => [r.data, ...p]);
      toast.success("Submitted for approval!");
      setShowSubmit(false);
      setSubmitForm({ forecast_id: "", comments: "" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleReview = async (approvalId) => {
    setReviewing(true);
    try {
      await approvalsAPI.review(approvalId, reviewForm);
      toast.success(`Forecast ${reviewForm.action}d!`);
      fetchAll();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setReviewing(false); }
  };

  const handleSelectApproval = async (a) => {
    setSelected(a);
    try { const r = await approvalsAPI.getHistory(a.id); setHistory(r.data || []); }
    catch { setHistory([]); }
  };

  const isReviewer = user?.is_admin || ["super_admin", "analyst"].includes(user?.role);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="page-title flex items-center gap-2"><MdGavel className="text-primary-500" /> Approval Workflow</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Submit forecasts for review and manage approval processes</p>
        </div>
        <button onClick={() => setShowSubmit(!showSubmit)} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2 flex-shrink-0">
          <MdSend /><span className="hidden sm:inline">Submit</span>
        </button>
      </div>

      {showSubmit && (
        <div className="glass-card p-4 md:p-5 animate-slide-up">
          <h2 className="section-title mb-4">Submit Forecast for Approval</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Select Forecast *</label>
              <select className="input-field" value={submitForm.forecast_id}
                onChange={(e) => setSubmitForm({ ...submitForm, forecast_id: e.target.value })}>
                <option value="">Choose completed forecast…</option>
                {forecasts.map((f) => <option key={f.id} value={f.id}>{f.name} — {f.model_type}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Comments (optional)</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Add context for the reviewer…"
                value={submitForm.comments} onChange={(e) => setSubmitForm({ ...submitForm, comments: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Submit for Approval
              </button>
              <button type="button" onClick={() => setShowSubmit(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize ${filterStatus === s ? "bg-orange-500 text-white" : "btn-secondary"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 glass-card p-4 md:p-5">
          <h2 className="section-title mb-4">Approval Requests</h2>
          {loading ? <SkeletonTable rows={4} /> : approvals.length === 0 ? (
            <div className="text-center py-10">
              <MdGavel className="text-4xl text-primary-200 mx-auto mb-3" />
              <p className="text-sm" style={{ color:"var(--text-muted)" }}>No approval requests found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {approvals.map((a) => {
                const cfg = statusConfig[a.status] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <div key={a.id} onClick={() => handleSelectApproval(a)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border-2
                      ${selected?.id === a.id ? "border-primary-400 bg-primary-50 dark:bg-primary-900/40" : "border-transparent bg-primary-50 dark:bg-primary-900/30 hover:border-primary-200"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color:"var(--text)" }}>
                          {a.forecast_name || `Forecast #${a.forecast_id}`}
                        </p>
                        <p className="text-xs text-primary-400 mt-0.5 font-mono">{a.forecast_model}</p>
                        {a.comments && <p className="text-xs text-primary-500 mt-1 truncate">"{a.comments}"</p>}
                        <p className="text-xs text-primary-400 mt-1">{a.submitted_at?.slice(0,16).replace("T"," ")}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Icon className={`text-base ${a.status === "approved" ? "text-primary-500" : a.status === "rejected" ? "text-red-500" : "text-yellow-500"}`} />
                        <span className={cfg.badge}>{a.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:col-span-2 glass-card p-4 md:p-5">
          {selected ? (
            <div className="space-y-4">
              <h2 className="section-title">{selected.forecast_name}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-primary-400">Status</span><span className={statusConfig[selected.status]?.badge}>{selected.status}</span></div>
                <div className="flex justify-between"><span className="text-primary-400">Model</span><span className="font-mono text-xs" style={{ color:"var(--text)" }}>{selected.forecast_model}</span></div>
                <div className="flex justify-between"><span className="text-primary-400">Submitted</span><span style={{ color:"var(--text)" }}>{selected.submitted_at?.slice(0,10)}</span></div>
                {selected.reviewed_at && <div className="flex justify-between"><span className="text-primary-400">Reviewed</span><span style={{ color:"var(--text)" }}>{selected.reviewed_at?.slice(0,10)}</span></div>}
                {selected.rejection_reason && <div><span className="text-red-400 text-xs">Rejection: </span><span className="text-xs" style={{ color:"var(--text)" }}>{selected.rejection_reason}</span></div>}
              </div>

              {isReviewer && selected.status === "pending" && (
                <div className="space-y-3 border-t border-primary-100 dark:border-primary-800 pt-4">
                  <h3 className="text-sm font-semibold" style={{ color:"var(--text)" }}>Review Decision</h3>
                  <div className="flex gap-2">
                    {["approve","reject"].map((a) => (
                      <button key={a} onClick={() => setReviewForm((f) => ({ ...f, action: a }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all
                          ${reviewForm.action === a ? (a === "approve" ? "bg-orange-500 text-white" : "bg-red-500 text-white") : "btn-secondary"}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <textarea className="input-field resize-none text-sm" rows={2}
                    placeholder={reviewForm.action === "reject" ? "Rejection reason…" : "Optional comment…"}
                    value={reviewForm.action === "reject" ? reviewForm.rejection_reason : reviewForm.comments}
                    onChange={(e) => setReviewForm((f) => reviewForm.action === "reject"
                      ? { ...f, rejection_reason: e.target.value }
                      : { ...f, comments: e.target.value })} />
                  <button onClick={() => handleReview(selected.id)} disabled={reviewing}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all
                      ${reviewForm.action === "approve" ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                    {reviewing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {reviewForm.action === "approve" ? "✓ Approve" : "✗ Reject"}
                  </button>
                </div>
              )}

              {history.length > 0 && (
                <div className="border-t border-primary-100 dark:border-primary-800 pt-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color:"var(--text)" }}>
                    <MdHistory className="text-primary-500" /> Audit Trail
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                        <div><p className="font-medium capitalize" style={{ color:"var(--text)" }}>{h.action}</p>
                          {h.note && <p className="text-primary-400">"{h.note}"</p>}
                          <p className="text-primary-400">{h.created_at?.slice(0,16).replace("T"," ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-primary-300">
              <MdGavel className="text-5xl mb-3" />
              <p className="text-sm">Select an approval to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
