import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { materialsAPI } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.jsx';

export const WorkspaceSelector = () => {
  const navigate = useNavigate();

  const { data: materials, isLoading } = useQuery({
    queryKey: ['workspaceMaterialsList'],
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

  return (
    <div className="flex flex-col gap-6 w-full p-6 text-left font-poppins">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-brain text-indigo-600"></i>
          AI Workspace Selector
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Select an uploaded academic document below to open the dynamic split-pane AI Chat Space.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : !materials || materials.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-22 text-slate-400 text-xs font-bold">
          <i className="ti ti-folder-open text-2xl mb-1 block"></i>
          No materials published to select from.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((mat) => (
            <div
              key={mat.id}
              onClick={() => navigate(`/workspace/${mat.id}`)}
              className="bg-white border border-slate-200/60 rounded-22 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[160px] cursor-pointer hover:border-indigo-500 group hover:-translate-y-1"
            >
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getSubjectColor(mat.subject)}`}>
                  {mat.subject}
                </span>
                <h4 className="text-sm font-extrabold text-slate-700 mt-3 truncate group-hover:text-indigo-600 transition-colors">
                  {mat.title}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">Published by Teacher: {mat.uploaded_by_name}</p>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-3">
                <span className="text-[10px] font-bold text-slate-400">
                  <i className="ti ti-file-text"></i> {mat.page_count || 1} pages
                </span>
                <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                  Launch Assistant <i className="ti ti-arrow-right animate-pulse"></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
};
