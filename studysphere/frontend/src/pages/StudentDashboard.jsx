import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsAPI, materialsAPI } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.jsx';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch Student Dashboard Stats
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['studentDashboardStats'],
    queryFn: async () => {
      const res = await analyticsAPI.getStudentDashboard();
      return res.data;
    },
  });

  // 2. Fetch Available Study Materials from Teachers
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['studentMaterialsList'],
    queryFn: async () => {
      const res = await materialsAPI.list();
      return res.data;
    },
  });

  const getSubjectColor = (sub) => {
    switch (sub) {
      case 'Mathematics': return 'bg-pink-100 text-pink-600';
      case 'Physics': return 'bg-cyan-100 text-cyan-600';
      case 'History': return 'bg-amber-100 text-amber-600';
      case 'English': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex flex-col gap-8 w-full p-6 text-left font-poppins">
      
      {/* Personalized greeting header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          {getGreeting()}, {user?.full_name || user?.username}! 👋
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Welcome back to your StudySphere workspace. Let's study with AI today!
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="stat" />)
        ) : (
          <>
            {/* Card 1: accessed */}
            <div className="rounded-22 bg-gradient-to-br from-pink-500 to-purple-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-pink-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-100">Files Accessed</span>
                <i className="ti ti-file-text text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{dashboardStats?.total_materials_accessed || 0}</h3>
                <p className="text-[10px] font-medium text-pink-200 mt-1">Materials read</p>
              </div>
            </div>

            {/* Card 2: AI Queries */}
            <div className="rounded-22 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-cyan-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-100">AI Queries</span>
                <i className="ti ti-brain text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{dashboardStats?.total_queries_made || 0}</h3>
                <p className="text-[10px] font-medium text-cyan-200 mt-1">Questions Asked</p>
              </div>
            </div>

            {/* Card 3: study hours */}
            <div className="rounded-22 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 flex flex-col justify-between shadow-lg shadow-amber-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100">Study Hours</span>
                <i className="ti ti-clock text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{dashboardStats?.study_hours || 0} hrs</h3>
                <p className="text-[10px] font-medium text-amber-200 mt-1">Engaged Reading Time</p>
              </div>
            </div>

            {/* Card 4: saved answers */}
            <div className="rounded-22 bg-gradient-to-br from-emerald-400 to-cyan-500 text-white p-5 flex flex-col justify-between shadow-lg shadow-emerald-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">Saved Answers</span>
                <i className="ti ti-heart text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{dashboardStats?.saved_answers || 0}</h3>
                <p className="text-[10px] font-medium text-emerald-200 mt-1">Archived Conversations</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Continue Studying Row */}
      <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Continue Studying</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pick up right where you left off. Review active learning files.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
          ) : !dashboardStats?.recent_materials || dashboardStats.recent_materials.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl">
              No recent files history found. Explore materials to start!
            </div>
          ) : (
            dashboardStats.recent_materials.map((mat) => (
              <div
                key={mat.id}
                onClick={() => navigate(`/workspace/${mat.id}`)}
                className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl hover:border-indigo-400 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between h-[110px]"
              >
                <div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${getSubjectColor(mat.subject)}`}>
                    {mat.subject}
                  </span>
                  <h4 className="text-xs font-bold text-slate-700 truncate mt-2">{mat.title}</h4>
                </div>
                <span className="text-[9px] text-slate-400 mt-2 font-medium">
                  Last seen: {new Date(mat.last_visited).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Full Materials Grid */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Study Materials Directory</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Explore files published by your teachers. Ask AI to analyze.</p>
        </div>

        {materialsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : !materials || materials.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold bg-white border border-slate-200 rounded-22">
            <i className="ti ti-folder-open text-3xl mb-1 block"></i>
            No learning materials published by your instructors yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="bg-white border border-slate-200/60 rounded-22 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[180px] hover:border-indigo-400"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getSubjectColor(mat.subject)}`}>
                      {mat.subject}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold">{mat.file_size_mb} MB</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-700 mt-3 truncate">{mat.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Uploaded by Teacher: {mat.uploaded_by_name}</p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span><i className="ti ti-file-text"></i> {mat.page_count || 1} pgs</span>
                    <span>•</span>
                    <span><i className="ti ti-brain"></i> {mat.query_count} queries</span>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/workspace/${mat.id}`)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-150 flex items-center gap-1"
                  >
                    Ask AI <i className="ti ti-arrow-right"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
};
