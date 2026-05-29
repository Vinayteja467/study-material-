import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.jsx';

export const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');

  // Form states for creating/editing users
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Student');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for announcements
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // 1. Fetch Users List
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await adminAPI.getUsers();
      return res.data;
    },
    enabled: activeTab === 'users',
  });

  // 2. Fetch Platform-wide Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await adminAPI.getStats();
      return res.data;
    },
    enabled: activeTab === 'stats',
  });

  // 3. Fetch Platform Materials (PDFs)
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['adminMaterials'],
    queryFn: async () => {
      const res = await adminAPI.getMaterials();
      return res.data;
    },
    enabled: activeTab === 'materials',
  });

  // 4. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload) => {
      return adminAPI.createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('Student');
      setErrorMsg('');
      setShowAddUser(false);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || 'Failed to register account.');
    },
  });

  // 5. Update User Mutation (Activation status & Role swaps)
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return adminAPI.updateUser(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  // 6. Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('User account deleted.');
    },
  });

  // 7. Delete Material Mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteMaterial(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMaterials'] });
      alert('Learning material successfully removed from platform.');
    },
  });

  // 8. Publish Announcement Mutation
  const announceMutation = useMutation({
    mutationFn: async (payload) => {
      return adminAPI.announce(payload);
    },
    onSuccess: () => {
      setAnnTitle('');
      setAnnContent('');
      alert('Broadcast system alert dispatched!');
    },
  });

  const handleRegisterUser = (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword) return;
    createUserMutation.mutate({
      username: newUsername,
      email: newEmail,
      password: newPassword,
      role: newRole,
    });
  };

  const handleAnnounceSubmit = (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    announceMutation.mutate({
      title: annTitle,
      content: annContent,
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full p-6 text-left font-poppins bg-[#FFF8F0] min-h-screen">
      
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-shield-lock text-indigo-600"></i>
          Admin Control Panel
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Perform user account CRUD, audit PDF databases, inspect platform storage, and broadcast alerts.
        </p>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-slate-200/80 gap-6">
        {[
          { id: 'users', label: 'Users Directory', icon: 'ti-users' },
          { id: 'stats', label: 'Platform Stats', icon: 'ti-chart-bar' },
          { id: 'materials', label: 'Files Archive', icon: 'ti-files' },
          { id: 'broadcast', label: 'Announce Alert', icon: 'ti-speakerphone' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3.5 text-xs font-bold uppercase tracking-wider relative transition-all ${
              activeTab === tab.id 
                ? 'text-indigo-600 font-black' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`ti ${tab.icon} text-base`}></i>
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* ==============================================
          TAB 1: USERS DIRECTORY MANAGEMENT
          ============================================== */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-6">
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Registered Member Accounts</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Swap roles, suspend logs, or clear user registers.</p>
            </div>

            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1.5"
            >
              <i className="ti ti-user-plus text-sm"></i>
              Add User
            </button>
          </div>

          {/* Add User collapsible sub-card */}
          {showAddUser && (
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm max-w-lg">
              <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Register New Account</h4>
              <form onSubmit={handleRegisterUser} className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Default Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="col-span-2 text-[10px] font-bold text-rose-500 p-2 bg-rose-50 rounded-xl border border-rose-100">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="col-span-2 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-all shadow"
                >
                  Create Profile
                </button>
              </form>
            </div>
          )}

          {/* User grid table */}
          <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm overflow-x-auto select-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-3">User Profile</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Authority Role</th>
                  <th className="pb-3">Queries Checked</th>
                  <th className="pb-3">Access Status</th>
                  <th className="pb-3 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td colSpan={6} className="py-4">
                        <Skeleton variant="row" />
                      </td>
                    </tr>
                  ))
                ) : !users || users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-xs font-bold">No users registered.</td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pl-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs">
                            {item.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-700">{item.full_name || item.username}</span>
                            <span className="text-[9px] text-slate-400 font-semibold">User ID: #{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-slate-500 font-semibold">{item.email}</td>
                      <td className="py-3.5 text-xs">
                        <select
                          value={item.role}
                          onChange={(e) => updateUserMutation.mutate({ id: item.id, payload: { role: e.target.value } })}
                          className="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none"
                        >
                          <option value="Student">Student</option>
                          <option value="Teacher">Teacher</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="py-3.5 text-xs text-indigo-600 font-extrabold pr-2">
                        <i className="ti ti-messages mr-1"></i> {item.query_count}
                      </td>
                      <td className="py-3.5 text-xs">
                        <button
                          onClick={() => updateUserMutation.mutate({ id: item.id, payload: { is_active: !item.is_active } })}
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.is_active 
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                          } transition-all`}
                        >
                          {item.is_active ? 'Active' : 'Suspended'}
                        </button>
                      </td>
                      <td className="py-3.5 text-right pr-3">
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete account ${item.username}?`)) {
                              deleteUserMutation.mutate(item.id);
                            }
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg text-sm transition-colors"
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ==============================================
          TAB 2: PLATFORM-WIDE STATISTICS
          ============================================== */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-6">
          
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Global Platform Auditor</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Review storage spaces, API hits, and total registry weights.</p>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Stat card group */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Registered', val: stats?.total_users, desc: 'Registered accounts', color: 'from-pink-500 to-purple-600', icon: 'ti-users' },
                  { title: 'Materials Count', val: stats?.total_materials, desc: 'Uploaded documents', color: 'from-cyan-500 to-indigo-600', icon: 'ti-file-text' },
                  { title: 'Queries processed', val: stats?.total_queries, desc: 'Ask chat actions', color: 'from-amber-400 to-orange-500', icon: 'ti-messages' },
                  { title: 'Platform Storage', val: `${stats?.storage_used_mb} MB`, desc: 'PDF file weights', color: 'from-emerald-400 to-cyan-500', icon: 'ti-server' }
                ].map((st, idx) => (
                  <div key={idx} className={`rounded-22 bg-gradient-to-br ${st.color} text-white p-5 flex flex-col justify-between shadow-lg`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">{st.title}</span>
                      <i className={`ti ${st.icon} text-xl bg-white/20 p-2 rounded-xl`}></i>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-black">{st.val || 0}</h3>
                      <p className="text-[10px] font-medium text-white/70 mt-1">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra details blocks */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm text-left">
                  <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-3">User Distribution Profiles</h4>
                  <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-500">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span>Students enrolled</span>
                      <span className="text-slate-800 font-bold">{stats?.total_students || 0}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span>Teachers registered</span>
                      <span className="text-slate-800 font-bold">{stats?.total_teachers || 0}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Staff Administrators</span>
                      <span className="text-indigo-600 font-bold">{stats?.total_users - stats?.total_students - stats?.total_teachers || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm text-left">
                  <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-3">Activity Timings Audit</h4>
                  <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-500">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span>AI Questions Today</span>
                      <span className="text-emerald-500 font-bold">{stats?.queries_today || 0} hits</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Account Registrations (7d)</span>
                      <span className="text-indigo-600 font-bold">+{stats?.new_users_this_week || 0} profiles</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ==============================================
          TAB 3: FILES DIRECTORY AUDIT
          ============================================== */}
      {activeTab === 'materials' && (
        <div className="flex flex-col gap-6">
          
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Platform PDFs Inventories</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Track, review, or delete documents uploaded across all subjects.</p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm overflow-x-auto select-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-3">Material Title</th>
                  <th className="pb-3">Subject Classification</th>
                  <th className="pb-3">File size (MB)</th>
                  <th className="pb-3">Uploaded By</th>
                  <th className="pb-3">API Hits Count</th>
                  <th className="pb-3 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materialsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td colSpan={6} className="py-4">
                        <Skeleton variant="row" />
                      </td>
                    </tr>
                  ))
                ) : !materials || materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-xs font-bold">No academic materials found.</td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pl-3 font-semibold text-slate-700 text-xs truncate max-w-[200px]">{m.title}</td>
                      <td className="py-3.5 text-xs font-bold text-slate-500">{m.subject}</td>
                      <td className="py-3.5 text-xs text-slate-400 font-semibold">{m.file_size_mb} MB</td>
                      <td className="py-3.5 text-xs text-slate-600 font-semibold">{m.uploader_name}</td>
                      <td className="py-3.5 text-xs text-indigo-600 font-black">
                        <i className="ti ti-messages mr-1"></i> {m.query_count}
                      </td>
                      <td className="py-3.5 text-right pr-3">
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you absolutely sure you want to delete ${m.title}? This action is irreversible and will delete indexed vector FAISS contexts.`)) {
                              deleteMaterialMutation.mutate(m.id);
                            }
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg text-sm transition-colors"
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ==============================================
          TAB 4: BROADCAST SYSTEM ANNOUNCEMENT
          ============================================== */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          
          <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Announcements Dispatcher</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Broadcast system alerts displayed directly on dashboard banners.</p>
            </div>

            <form onSubmit={handleAnnounceSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Alert Header Title</label>
                <input
                  type="text"
                  placeholder="e.g. Server Maintenance Notice"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Message Body Block</label>
                <textarea
                  rows={4}
                  placeholder="Write clear notification messages detailing dates, system warnings, or course announcements."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={announceMutation.isPending}
                className="py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold rounded-22 shadow-lg shadow-pink-500/10 uppercase tracking-wider transition-all"
              >
                {announceMutation.isPending ? 'Broadcasting...' : 'Dispatch Announcement Broadcast'}
              </button>
            </form>
          </div>

          <div className="rounded-22 bg-indigo-50/50 border border-indigo-100 p-6 flex flex-col gap-4 text-left">
            <h4 className="text-sm font-extrabold text-indigo-900 uppercase tracking-wider">Broadcast Instructions</h4>
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-indigo-950 font-medium">
              <p>System announcements are highlighted instantly for both **Teachers** and **Students** inside their main dashboard panels.</p>
              <p>Useful for:</p>
              <ul className="list-disc pl-4 flex flex-col gap-1">
                <li>Server downtime or backend upgrades.</li>
                <li>System-wide feature additions.</li>
                <li>Universal academic reminders or final test directives.</li>
              </ul>
              <p className="text-[10px] text-indigo-500/80 italic mt-4">Note: Announcements are ordered chronologically, showing the latest first.</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
