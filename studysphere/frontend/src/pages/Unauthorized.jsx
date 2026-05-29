import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0] p-6 font-poppins">
      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-22 shadow-lg p-8 text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 text-3xl">
          <i className="ti ti-lock"></i>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Access Denied</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            You do not have the required permissions or roles to view this academic space. Please check with your supervisor or try switching profiles.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all duration-150"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
