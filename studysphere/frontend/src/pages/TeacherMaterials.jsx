import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { materialsAPI } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Skeleton } from '../components/Skeleton.jsx';

export const TeacherMaterials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterSubject, setFilterSubject] = useState('All');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materialsList'],
    queryFn: async () => {
      const res = await materialsAPI.list();
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return materialsAPI.destroy(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialsList'] });
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

  const filteredMaterials = materials?.filter((mat) => {
    if (filterSubject === 'All') return true;
    return mat.subject === filterSubject;
  });

  return (
    <div className="flex flex-col gap-6 w-full p-6 text-left font-poppins">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-files text-indigo-600"></i>
          Study Materials Archive
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Browse and manage all PDFs published in the portal. Open a file to start studying.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
        {['All', 'Mathematics', 'Physics', 'History', 'English', 'Other'].map((sub) => (
          <button
            key={sub}
            onClick={() => setFilterSubject(sub)}
            className={`py-2 px-4 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              filterSubject === sub
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Materials Directory list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : !filteredMaterials || filteredMaterials.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-xs font-bold bg-white border border-slate-200 rounded-22">
          <i className="ti ti-folder-open text-3xl mb-1 block"></i>
          No files matching criteria found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => (
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
                
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/workspace/${mat.id}`)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all duration-150 flex items-center gap-1 shadow-sm"
                  >
                    Open AI Chat
                  </button>
                  {user?.role === 'Teacher' && (
                    <button
                      onClick={() => deleteMutation.mutate(mat.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 border border-slate-100 rounded-lg text-sm transition-colors"
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
};
