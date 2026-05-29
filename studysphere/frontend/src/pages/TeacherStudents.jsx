import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from '../api/client.js';

export const TeacherStudents = () => {
  const { data: students, isLoading } = useQuery({
    queryKey: ['studentsList'],
    queryFn: async () => {
      const res = await authAPI.getStudents();
      return res.data;
    },
  });

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col gap-6 w-full p-6 text-left font-poppins">
      
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-users text-indigo-600"></i>
          Students Directory
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Review a directory of students registered under the StudySphere portal.
        </p>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-bold">Loading students directory...</span>
          </div>
        ) : !students || students.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold">
            <i className="ti ti-users text-2xl mb-1 block"></i>
            No students registered in the platform yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-4 p-4 border border-slate-100 rounded-22 bg-slate-50 hover:border-indigo-400 hover:shadow-sm transition-all duration-200"
              >
                {student.profile_picture ? (
                  <img
                    src={student.profile_picture}
                    alt={student.username}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                    {getInitials(student.full_name || student.username)}
                  </div>
                )}
                
                <div className="flex-grow flex flex-col text-left truncate">
                  <h4 className="text-sm font-bold text-slate-700 truncate">{student.full_name || student.username}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{student.email}</span>
                  {student.bio && (
                    <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 leading-normal">
                      "{student.bio}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
};
