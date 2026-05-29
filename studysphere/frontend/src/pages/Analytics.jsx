import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsAPI } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.jsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const Analytics = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'Teacher';

  // 1. Fetch Teacher Stats Dashboard
  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacherAnalyticsDashboard'],
    queryFn: async () => {
      const res = await analyticsAPI.getTeacherDashboard();
      return res.data;
    },
    enabled: isTeacher,
  });

  // 2. Fetch Student Personal Analytics
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['studentAnalyticsDashboard'],
    queryFn: async () => {
      const res = await analyticsAPI.getStudentAnalytics();
      return res.data;
    },
    enabled: !isTeacher,
  });

  // Color constants for Pie slices matching our gradients
  const PIE_COLORS = ['#ff6b9d', '#36d1dc', '#fda085', '#84fab0', '#c445ff', '#5b86e5'];

  return (
    <div className="flex flex-col gap-8 w-full p-6 text-left font-poppins bg-[#FFF8F0] min-h-screen">
      
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-chart-infographics text-indigo-600"></i>
          Analytics Dashboard
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          {isTeacher
            ? 'Review classroom activity, material queries, and student engagement statistics.'
            : 'Track study streaks, daily learning activities, and query distributions.'}
        </p>
      </div>

      {/* ==============================================
          TEACHER ANALYTICS VIEW
          ============================================== */}
      {isTeacher && (
        <div className="flex flex-col gap-8">
          
          {/* Stat metrics cards */}
          {teacherLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Stat card 1 */}
              <div className="rounded-22 bg-gradient-to-br from-pink-500 to-purple-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-pink-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-100">Queries This Week</span>
                  <i className="ti ti-chart-arrows text-xl bg-white/20 p-2 rounded-xl"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black">{teacherData?.total_stats?.queries_this_week || 0}</h3>
                  <p className="text-[10px] font-medium text-pink-200 mt-1">Active AI Questions Checked</p>
                </div>
              </div>

              {/* Stat card 2 */}
              <div className="rounded-22 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-cyan-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-100">Queries Today</span>
                  <i className="ti ti-bolt text-xl bg-white/20 p-2 rounded-xl"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black">{teacherData?.total_stats?.queries_today || 0}</h3>
                  <p className="text-[10px] font-medium text-cyan-200 mt-1">Live Transactions</p>
                </div>
              </div>

              {/* Stat card 3 */}
              <div className="rounded-22 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 flex flex-col justify-between shadow-lg shadow-amber-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100">Materials Uploaded</span>
                  <i className="ti ti-folder text-xl bg-white/20 p-2 rounded-xl"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black">{teacherData?.total_stats?.materials || 0}</h3>
                  <p className="text-[10px] font-medium text-amber-200 mt-1">PDF Files Handled</p>
                </div>
              </div>

              {/* Stat card 4 */}
              <div className="rounded-22 bg-gradient-to-br from-emerald-400 to-cyan-500 text-white p-5 flex flex-col justify-between shadow-lg shadow-emerald-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">Registered Students</span>
                  <i className="ti ti-users text-xl bg-white/20 p-2 rounded-xl"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black">{teacherData?.total_stats?.students || 0}</h3>
                  <p className="text-[10px] font-medium text-emerald-200 mt-1">Student Accounts Registered</p>
                </div>
              </div>

            </div>
          )}

          {/* Core visual charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Weekly activity Area graph */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Weekly Activity Timeline</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Audits of query requests vs study material uploads over last 7 days.</p>
              </div>

              <div className="w-full h-80 text-xs">
                {teacherLoading ? (
                  <Skeleton variant="chart" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teacherData?.weekly_activity || []}>
                      <defs>
                        <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="queries" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQueries)" name="Queries" />
                      <Area type="monotone" dataKey="uploads" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUploads)" name="Uploads" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Subject performance Bar graph */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Subject Query Performance</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Average AI queries processed per study subject.</p>
              </div>

              <div className="w-full h-80 text-xs">
                {teacherLoading ? (
                  <Skeleton variant="chart" />
                ) : !teacherData?.subject_performance || teacherData.subject_performance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 font-bold">
                    <i className="ti ti-chart-bar text-3xl"></i>
                    <span>No subject metrics recorded yet.</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teacherData.subject_performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="subject" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="avg_queries" fill="#6366f1" radius={[10, 10, 0, 0]} name="Avg Queries">
                        {teacherData.subject_performance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Grid: Top Materials & Student Engagement grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Top Materials Scoreboard */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4 text-left">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Popular Learning Materials</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Top 5 uploaded files sorted by active query transactions.</p>
              </div>

              <div className="flex flex-col gap-3">
                {teacherLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="row" />)
                ) : !teacherData?.top_materials || teacherData.top_materials.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-bold text-xs">No active documents queried yet.</div>
                ) : (
                  teacherData.top_materials.map((mat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3 truncate pr-2 text-left">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-bold text-slate-700 truncate">{mat.title}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{mat.subject}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 bg-indigo-100/40 px-3 py-1.5 rounded-xl border border-indigo-100">
                        <i className="ti ti-messages text-xs text-indigo-600"></i>
                        <span className="text-xs font-black text-indigo-600">{mat.query_count} queries</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Student Engagement Grid */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4 text-left">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Student Engagement Metrics</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Activity counts for students query checks on your assets.</p>
              </div>

              <div className="flex flex-col gap-3">
                {teacherLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="row" />)
                ) : !teacherData?.student_engagement || teacherData.student_engagement.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-bold text-xs">No student engagements logged yet.</div>
                ) : (
                  teacherData.student_engagement.map((eng, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center font-black text-xs text-pink-500">
                          {eng.student_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700">{eng.student_name}</span>
                          <span className="text-[9px] text-slate-400 font-bold">Accessed {eng.materials_accessed} study files</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-slate-700">{eng.queries_this_week} Queries</span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5">This week</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==============================================
          STUDENT PERSONAL VIEW
          ============================================== */}
      {!isTeacher && (
        <div className="flex flex-col gap-8">
          
          {/* Student Stats panel */}
          {studentLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Flame Hot Streak Card */}
              <div className="rounded-22 bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-orange-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100">Study Hot Streak</span>
                  <i className="ti ti-flame text-xl bg-white/20 p-2 rounded-xl animate-bounce"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black flex items-baseline gap-1">
                    {studentData?.study_streak || 0}
                    <span className="text-xs font-bold text-amber-200">days</span>
                  </h3>
                  <p className="text-[10px] font-medium text-amber-200 mt-1">Consecutive learning activity days!</p>
                </div>
              </div>

              {/* Weak Subjects Card */}
              <div className="rounded-22 bg-gradient-to-br from-pink-500 to-purple-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-pink-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-100">Weak Area Alerts</span>
                  <i className="ti ti-alert-triangle text-xl bg-white/20 p-2 rounded-xl"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-base font-black truncate">
                    {studentData?.weak_subjects && studentData.weak_subjects.length > 0 
                      ? studentData.weak_subjects.join(', ') 
                      : 'None Identified! ✓'}
                  </h3>
                  <p className="text-[10px] font-medium text-pink-200 mt-1">Subjects requiring active reading focus</p>
                </div>
              </div>

              {/* Total Queries logged */}
              <div className="rounded-22 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-cyan-500/10">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-100">Total Chat Checks</span>
                  <i className="ti ti-message-code text-xl bg-white/20 p-2 rounded-xl"></i>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-black">
                    {studentData?.daily_activity?.reduce((sum, item) => sum + item.queries, 0) || 0}
                  </h3>
                  <p className="text-[10px] font-medium text-cyan-200 mt-1">Total questions checked via Gemini QA</p>
                </div>
              </div>

            </div>
          )}

          {/* Student core visual graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* 14-day study activity timeline Area graph (span 3) */}
            <div className="lg:col-span-3 bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">14-Day Study frequency Tracker</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Visualization of your daily ask log count metrics over 2 weeks.</p>
              </div>

              <div className="w-full h-80 text-xs">
                {studentLoading ? (
                  <Skeleton variant="chart" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={studentData?.daily_activity || []}>
                      <defs>
                        <linearGradient id="studentColorQueries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#36d1dc" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#36d1dc" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="queries" stroke="#36d1dc" strokeWidth={2.5} fillOpacity={1} fill="url(#studentColorQueries)" name="Queries" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Slices of Pie distribution per subject (span 2) */}
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Subject Query Distribution</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Breakdowns showing your query distribution share.</p>
              </div>

              <div className="w-full h-80 text-xs flex flex-col items-center justify-center">
                {studentLoading ? (
                  <Skeleton variant="chart" />
                ) : !studentData?.queries_by_subject || studentData.queries_by_subject.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 font-bold">
                    <i className="ti ti-chart-pie text-3xl"></i>
                    <span>No query actions registered yet.</span>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={studentData.queries_by_subject}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {studentData.queries_by_subject.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* legend blocks */}
                    <div className="flex flex-wrap gap-2.5 justify-center mt-2.5">
                      {studentData.queries_by_subject.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                          <span>{item.subject} ({item.count})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
