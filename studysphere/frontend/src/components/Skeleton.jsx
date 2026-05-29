import React from 'react';

export const Skeleton = ({ variant = 'card' }) => {
  if (variant === 'stat') {
    return (
      <div className="h-28 rounded-22 bg-slate-200 animate-pulse flex flex-col justify-between p-5">
        <div className="w-10 h-10 rounded-full bg-slate-300"></div>
        <div className="flex flex-col gap-2">
          <div className="h-4 w-2/3 bg-slate-300 rounded"></div>
          <div className="h-6 w-1/3 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-4 py-3 border-b border-slate-200 animate-pulse">
        <div className="w-10 h-10 rounded bg-slate-300"></div>
        <div className="flex-grow flex flex-col gap-2">
          <div className="h-3 w-1/4 bg-slate-300 rounded"></div>
          <div className="h-3 w-1/2 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 rounded-22 bg-slate-200 animate-pulse p-5 flex flex-col justify-between">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-1/3 bg-slate-300 rounded"></div>
        <div className="h-6 w-3/4 bg-slate-300 rounded"></div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-3 w-1/4 bg-slate-300 rounded"></div>
        <div className="h-8 w-1/3 bg-slate-300 rounded-lg"></div>
      </div>
    </div>
  );
};
