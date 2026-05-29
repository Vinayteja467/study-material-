import React, { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, materialsAPI } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.jsx';

export const TeacherDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('Mathematics');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 1. Fetch Teacher Analytics & Activity Feed
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['teacherAnalytics'],
    queryFn: async () => {
      const res = await analyticsAPI.getTeacherStats();
      return res.data;
    },
  });

  // 2. Fetch Last Materials Uploads
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['teacherMaterials'],
    queryFn: async () => {
      const res = await materialsAPI.list();
      return res.data;
    },
  });

  // 3. Upload Material Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return materialsAPI.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['teacherMaterials'] });
      setUploadError('');
    },
    onError: (err) => {
      setUploadError(err.response?.data?.error || 'Failed to upload document.');
    },
  });

  // 4. Delete Material Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return materialsAPI.destroy(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['teacherMaterials'] });
    },
  });

  // File dropzone trigger
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    const file = acceptedFiles[0] || (rejectedFiles[0] && (rejectedFiles[0].file || rejectedFiles[0]));
    if (!file) return;
    
    const fileObj = file.file ? file.file : file;
    const extension = fileObj.name.split('.').pop().toLowerCase();
    
    if (extension !== 'pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', fileObj.name.replace('.pdf', ''));
    formData.append('subject', subject);
    formData.append('file', fileObj);

    uploadMutation.mutate(formData, {
      onSettled: () => {
        setIsUploading(false);
      }
    });
  }, [subject, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
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
    <div className="flex flex-col gap-8 w-full p-6 text-left">
      
      {/* Upper header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-chart-bar text-indigo-600"></i>
          Teacher Dashboard
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Monitor student engagements, upload learning PDFs, and review AI indexing statistics.
        </p>
      </div>

      {/* 4 Stat Cards with Gradient System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="stat" />)
        ) : (
          <>
            {/* Card 1: pink-purple */}
            <div className="rounded-22 bg-gradient-to-br from-pink-500 to-purple-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-pink-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-100">Total Students</span>
                <i className="ti ti-users text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{analytics?.total_students || 0}</h3>
                <p className="text-[10px] font-medium text-pink-200 mt-1">Registered Classmates</p>
              </div>
            </div>

            {/* Card 2: cyan-blue */}
            <div className="rounded-22 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-cyan-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-100">Uploaded PDFs</span>
                <i className="ti ti-file-text text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{analytics?.total_materials || 0}</h3>
                <p className="text-[10px] font-medium text-cyan-200 mt-1">Study Materials</p>
              </div>
            </div>

            {/* Card 3: yellow-orange */}
            <div className="rounded-22 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 flex flex-col justify-between shadow-lg shadow-amber-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100">AI Queries Today</span>
                <i className="ti ti-brain text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{analytics?.total_queries_today || 0}</h3>
                <p className="text-[10px] font-medium text-amber-200 mt-1">Gemini AI API Transactions</p>
              </div>
            </div>

            {/* Card 4: green-cyan */}
            <div className="rounded-22 bg-gradient-to-br from-emerald-400 to-cyan-500 text-white p-5 flex flex-col justify-between shadow-lg shadow-emerald-500/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">Student Engagement</span>
                <i className="ti ti-activity text-xl bg-white/20 p-2 rounded-xl"></i>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{analytics?.avg_engagement_percent || 0}%</h3>
                <p className="text-[10px] font-medium text-emerald-200 mt-1">Weekly Active Users Ratio</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Middle Grid: Upload PDFs & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Upload Frame */}
        <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-22 p-6 flex flex-col justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Upload Learning Materials</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Choose subject and drop PDF document to index.</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject Classification</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="History">History</option>
              <option value="English">English</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Drag and Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
              isDragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <i className={`ti ti-cloud-upload text-3xl ${isDragActive ? 'text-indigo-600' : 'text-slate-400'}`}></i>
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[11px] font-bold text-indigo-600">Uploading & Indexing FAISS...</span>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs font-bold text-slate-600">Drag & Drop PDF or Click</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Supports academic documents up to 50MB</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-bold text-rose-500">
              {uploadError}
            </div>
          )}
        </div>

        {/* Right Column Activities Logs */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-22 p-6 flex flex-col gap-4 shadow-sm h-[320px] overflow-hidden">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Recent Activities Feed</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Last 10 platform registration, upload, and question actions.</p>
          </div>

          <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-1">
            {analyticsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="row" />)
            ) : !analytics?.recent_activity || analytics.recent_activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                <i className="ti ti-activity text-2xl"></i>
                <span className="text-xs font-bold">No active logs logged yet.</span>
              </div>
            ) : (
              analytics.recent_activity.map((act, idx) => (
                <div key={idx} className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl items-center text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                    act.type === 'upload' ? 'bg-indigo-50 text-indigo-600' :
                    act.type === 'query' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-pink-50 text-pink-600'
                  }`}>
                    <i className={
                      act.type === 'upload' ? 'ti ti-file-upload' :
                      act.type === 'query' ? 'ti ti-messages' :
                      'ti ti-user-check'
                    }></i>
                  </div>
                  <div className="flex-grow flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 leading-snug">{act.description}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Materials Table showing last 5 uploads */}
      <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Inventories & Materials</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Overview of uploaded study files and query counters.</p>
          </div>
          <button
            onClick={() => navigate('/materials')}
            className="px-4 py-1.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Manage All
          </button>
        </div>

        <div className="overflow-x-auto select-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-3">Document Title</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Pages</th>
                <th className="pb-3">Q&A Count</th>
                <th className="pb-3 text-right pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materialsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td colSpan={6} className="py-4">
                      <div className="h-4 bg-slate-100 animate-pulse rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : !materials || materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs font-bold">
                    <i className="ti ti-folder-open text-2xl mb-1 block"></i>
                    No study material documents uploaded yet.
                  </td>
                </tr>
              ) : (
                materials.slice(0, 5).map((mat) => (
                  <tr key={mat.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3.5 pl-3 font-semibold text-slate-700 text-xs">{mat.title}</td>
                    <td className="py-3.5 text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getSubjectColor(mat.subject)}`}>
                        {mat.subject}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-slate-400 font-semibold">{mat.file_size_mb} MB</td>
                    <td className="py-3.5 text-xs text-slate-400 font-semibold">{mat.page_count || 1} pgs</td>
                    <td className="py-3.5 text-xs text-indigo-600 font-bold">
                      <i className="ti ti-messages mr-1"></i> {mat.query_count}
                    </td>
                    <td className="py-3.5 text-right pr-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/workspace/${mat.id}`)}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Open Workspace
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(mat.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg text-sm transition-colors"
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
