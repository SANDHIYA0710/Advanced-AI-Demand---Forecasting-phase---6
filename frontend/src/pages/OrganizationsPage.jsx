import { useState, useEffect } from "react";
import { organizationsAPI } from "../services/api";
import toast from "react-hot-toast";
import { MdBusiness, MdAdd, MdDelete, MdPeople, MdEdit, MdClose, MdPersonAdd } from "react-icons/md";
import { SkeletonTable } from "../components/ui/Skeleton";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ user_id: "", role: "analyst" });
  const [form, setForm] = useState({ name: "", description: "", plan: "standard" });

  useEffect(() => { fetchOrgs(); }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    try { const r = await organizationsAPI.list(); setOrgs(r.data || []); }
    catch {} finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      const r = await organizationsAPI.create(form);
      setOrgs((p) => [r.data, ...p]);
      toast.success("Organization created!");
      setShowForm(false);
      setForm({ name: "", description: "", plan: "standard" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const handleSelect = async (org) => {
    setSelected(org);
    try { const r = await organizationsAPI.listMembers(org.id); setMembers(r.data || []); }
    catch { setMembers([]); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.user_id) { toast.error("User ID required"); return; }
    try {
      await organizationsAPI.addMember(selected.id, { user_id: parseInt(memberForm.user_id), role: memberForm.role });
      toast.success("Member added!");
      const r = await organizationsAPI.listMembers(selected.id);
      setMembers(r.data || []);
      setShowAddMember(false);
      setMemberForm({ user_id: "", role: "analyst" });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    await organizationsAPI.removeMember(selected.id, userId);
    setMembers((p) => p.filter((m) => m.user_id !== userId));
    toast.success("Member removed");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this organization?")) return;
    await organizationsAPI.delete(id);
    setOrgs((p) => p.filter((o) => o.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted");
  };

  const planBadge = (plan) => ({ enterprise: "badge-success", professional: "badge-info", standard: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 badge" }[plan] || "badge");

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="page-title flex items-center gap-2"><MdBusiness className="text-primary-500" /> Organizations</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color:"var(--text-muted)" }}>Manage your enterprise organizations and team members</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 flex-shrink-0">
          <MdAdd /><span className="hidden sm:inline">New Org</span>
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 md:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Create Organization</h2>
            <button onClick={() => setShowForm(false)} className="text-primary-400 hover:text-primary-600"><MdClose /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Organization Name *</label>
              <input className="input-field" placeholder="e.g. Acme Corp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input-field resize-none" rows={2} placeholder="What does this organization do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input-field" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 w-full justify-center">
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? "Creating…" : "Create Organization"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <h2 className="section-title">Your Organizations</h2>
          {loading ? <SkeletonTable rows={3} /> : orgs.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <MdBusiness className="text-4xl text-primary-200 mx-auto mb-3" />
              <p className="text-sm" style={{ color:"var(--text-muted)" }}>No organizations yet.</p>
            </div>
          ) : orgs.map((org) => (
            <div key={org.id} onClick={() => handleSelect(org)}
              className={`glass-card p-4 cursor-pointer transition-all hover:border-primary-400 ${selected?.id === org.id ? "border-primary-400 shadow-green-glow" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color:"var(--text)" }}>{org.name}</p>
                  {org.description && <p className="text-xs text-primary-400 truncate mt-0.5">{org.description}</p>}
                  <div className="flex gap-2 mt-2">
                    <span className={planBadge(org.plan)}>{org.plan}</span>
                    <span className={org.status === "active" ? "badge-success" : "badge-warning"}>{org.status}</span>
                  </div>
                  <p className="text-xs text-primary-400 mt-1.5 flex items-center gap-1">
                    <MdPeople className="text-xs" />{org.member_count} members
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                  <MdDelete className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2 glass-card p-4 md:p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="section-title truncate">{selected.name} — Members</h2>
                <button onClick={() => setShowAddMember(!showAddMember)} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2 flex-shrink-0">
                  <MdPersonAdd /> Add Member
                </button>
              </div>
              {showAddMember && (
                <form onSubmit={handleAddMember} className="flex gap-2 mb-4 flex-wrap">
                  <input className="input-field text-sm flex-1 min-w-32" type="number" placeholder="User ID" value={memberForm.user_id}
                    onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })} />
                  <select className="input-field text-sm w-32" value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                    {["owner","admin","manager","analyst","viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="submit" className="btn-primary text-xs px-4">Add</button>
                  <button type="button" onClick={() => setShowAddMember(false)} className="btn-secondary text-xs px-3">Cancel</button>
                </form>
              )}
              {members.length === 0 ? (
                <p className="text-sm text-primary-400 text-center py-8">No members yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-primary-100 dark:border-primary-800">
                      <th className="table-th">Username</th><th className="table-th">Email</th>
                      <th className="table-th">Role</th><th className="table-th">Joined</th><th className="table-th"></th>
                    </tr></thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-primary-50 dark:border-primary-900">
                          <td className="table-td font-medium">{m.username || `User #${m.user_id}`}</td>
                          <td className="table-td text-primary-400 text-xs">{m.email || "—"}</td>
                          <td className="table-td"><span className="badge-info capitalize">{m.role}</span></td>
                          <td className="table-td text-xs text-primary-400">{m.joined_at?.slice(0,10)}</td>
                          <td className="table-td">
                            <button onClick={() => handleRemoveMember(m.user_id)} className="text-red-400 hover:text-red-600">
                              <MdDelete className="text-sm" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-primary-300">
              <MdBusiness className="text-5xl mb-3" />
              <p className="text-sm">Select an organization to manage members</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
