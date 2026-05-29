import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { attendanceAPI, subjectAPI, authAPI } from '../api/client.js';

export const Attendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTeacher = user?.role === 'Teacher';

  // State for Teacher view
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [tempRecords, setTempRecords] = useState({}); // { studentId: status }

  // 1. Fetch Students (for Teacher Subject creation)
  const { data: studentsList } = useQuery({
    queryKey: ['studentsList'],
    queryFn: async () => {
      const res = await authAPI.getStudents();
      return res.data;
    },
    enabled: isTeacher,
  });

  // 2. Fetch Teacher's Subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjectsList'],
    queryFn: async () => {
      const res = await subjectAPI.list();
      return res.data;
    },
  });

  // Automatically select first subject once loaded
  React.useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id.toString());
    }
  }, [subjects, selectedSubjectId]);

  // 3. Fetch Class Feed (for selected subject in Teacher view)
  const { data: classFeed, isLoading: classFeedLoading } = useQuery({
    queryKey: ['classFeed', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return null;
      const res = await attendanceAPI.classFeed(selectedSubjectId);
      return res.data;
    },
    enabled: isTeacher && !!selectedSubjectId,
  });

  // Initialize temp records when students load for the subject
  React.useEffect(() => {
    if (classFeed?.students) {
      const initial = {};
      classFeed.students.forEach(st => {
        // Find existing record for this student on the selected date if present
        const existing = classFeed.past_records.find(
          r => r.student === st.id && r.date === selectedDate
        );
        initial[st.id] = existing ? existing.status : 'Present';
      });
      setTempRecords(initial);
    }
  }, [classFeed, selectedDate]);

  // 4. Fetch Student's Attendance Summary (for Student view)
  const { data: studentSummary, isLoading: studentSummaryLoading } = useQuery({
    queryKey: ['studentSummary', user?.id],
    queryFn: async () => {
      if (isTeacher || !user?.id) return null;
      const res = await attendanceAPI.summary(user.id);
      return res.data;
    },
    enabled: !isTeacher && !!user?.id,
  });

  // 5. Create Subject Mutation
  const createSubjectMutation = useMutation({
    mutationFn: async (payload) => {
      return subjectAPI.create(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['subjectsList'] });
      setSelectedSubjectId(res.data.id.toString());
      setNewSubjectName('');
      setSelectedStudentIds([]);
      setShowCreateSubject(false);
    },
  });

  // 6. Submit Attendance Mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (payload) => {
      return attendanceAPI.mark(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classFeed', selectedSubjectId] });
      alert('Attendance successfully recorded!');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to submit attendance.');
    },
  });

  // 7. Edit Specific Log Mutation (Teacher History)
  const editAttendanceMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return attendanceAPI.edit(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classFeed', selectedSubjectId] });
    },
  });

  const handleStudentSelectToggle = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleCreateSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    createSubjectMutation.mutate({
      name: newSubjectName,
      students: selectedStudentIds,
    });
  };

  const handleStatusChange = (studentId, status) => {
    setTempRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = () => {
    if (!selectedSubjectId) return;
    const recordsPayload = Object.entries(tempRecords).map(([studentId, status]) => ({
      student_id: parseInt(studentId),
      status,
    }));
    markAttendanceMutation.mutate({
      subject_id: parseInt(selectedSubjectId),
      date: selectedDate,
      records: recordsPayload,
    });
  };

  // Student styling helpers
  const getProgressColor = (percent) => {
    if (percent >= 85) return 'stroke-emerald-500';
    if (percent >= 75) return 'stroke-indigo-500';
    return 'stroke-rose-500 text-rose-500';
  };

  const getProgressBg = (percent) => {
    if (percent >= 85) return 'text-emerald-500';
    if (percent >= 75) return 'text-indigo-500';
    return 'text-rose-500';
  };

  return (
    <div className="flex flex-col gap-8 w-full p-6 text-left font-poppins">
      
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-2">
          <i className="ti ti-calendar-check text-indigo-600"></i>
          Attendance Tracker
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          {isTeacher 
            ? 'Manage subjects, mark daily classroom roll-call states, and audit records.' 
            : 'Review overall percentages, subject status metrics, and attendance alerts.'}
        </p>
      </div>

      {/* ==============================================
          TEACHER DASHBOARD INTERFACE
          ============================================== */}
      {isTeacher && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Subjects list and roll call selector */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Subject Selector Card */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Subjects</h3>
                <button
                  onClick={() => setShowCreateSubject(!showCreateSubject)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold transition-all"
                >
                  {showCreateSubject ? 'View List' : 'Add Subject'}
                </button>
              </div>

              {subjectsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : showCreateSubject ? (
                /* Create Subject Form */
                <form onSubmit={handleCreateSubject} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Subject Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Physics 101"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Enroll Students</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50 flex flex-col gap-1.5">
                      {!studentsList || studentsList.length === 0 ? (
                        <span className="text-[10px] text-slate-400 font-bold p-2 text-center">No students registered yet.</span>
                      ) : (
                        studentsList.map(st => (
                          <label key={st.id} className="flex items-center gap-2 p-1 hover:bg-slate-200/50 rounded cursor-pointer text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(st.id)}
                              onChange={() => handleStudentSelectToggle(st.id)}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                            {st.full_name || st.username}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 hover:opacity-95 transition-all"
                  >
                    Create Subject Class
                  </button>
                </form>
              ) : !subjects || subjects.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-bold">
                  <i className="ti ti-calendar text-2xl mb-1 block"></i>
                  No subjects registered.
                </div>
              ) : (
                /* Select Subject and Date Form */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Select Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500"
                    >
                      {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Roll Call Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Subject Info Card */}
            {classFeed?.subject && !showCreateSubject && (
              <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-3">
                <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Subject Specifications</h4>
                <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span>Name</span>
                    <span className="text-slate-800">{classFeed.subject.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span>Teacher In-charge</span>
                    <span className="text-slate-800">{classFeed.subject.teacher_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enrolled Strength</span>
                    <span className="text-indigo-600 font-bold">{classFeed.subject.students?.length || 0} students</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right panel: Active roll call student grid & history log */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Active Attendance marking grid */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Mark Attendance Roll Call</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Toggle student status buttons and hit submit.</p>
              </div>

              {classFeedLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 font-bold">Fetching enrolled student roster...</span>
                </div>
              ) : !classFeed?.students || classFeed.students.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs font-bold">
                  <i className="ti ti-users-minus text-3xl mb-1 block"></i>
                  No students enrolled in this subject yet.
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {classFeed.students.map((student) => {
                      const currentStatus = tempRecords[student.id] || 'Present';
                      return (
                        <div key={student.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600">
                              {student.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-700">{student.full_name || student.username}</span>
                              <span className="text-[9px] text-slate-400 font-semibold">{student.email}</span>
                            </div>
                          </div>

                          {/* Quick Present/Absent/Late toggle button strip */}
                          <div className="flex items-center bg-slate-200/50 p-1 rounded-xl">
                            <button
                              onClick={() => handleStatusChange(student.id, 'Present')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                                currentStatus === 'Present' 
                                  ? 'bg-emerald-500 text-white shadow' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'Absent')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                                currentStatus === 'Absent' 
                                  ? 'bg-rose-500 text-white shadow' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'Late')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                                currentStatus === 'Late' 
                                  ? 'bg-amber-500 text-white shadow' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              Late
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleSubmitAttendance}
                    disabled={markAttendanceMutation.isPending}
                    className="py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs rounded-22 tracking-wider uppercase shadow-lg shadow-pink-500/10 transition-all disabled:opacity-50"
                  >
                    {markAttendanceMutation.isPending ? 'Saving Record...' : 'Submit Attendance Register'}
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Logs History Slider & Edit section */}
            {classFeed?.past_records && classFeed.past_records.length > 0 && (
              <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Subject Attendance Logs Archive</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Edit historical status records directly.</p>
                </div>

                <div className="max-h-[240px] overflow-y-auto flex flex-col gap-3 pr-1">
                  {classFeed.past_records.map((rec) => (
                    <div key={rec.id} className="flex justify-between items-center p-3 border border-slate-100 bg-slate-50/50 rounded-2xl text-left">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{rec.student_name}</span>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Date: {rec.date} • Log ID: #{rec.id}</span>
                      </div>

                      <select
                        value={rec.status}
                        onChange={(e) => editAttendanceMutation.mutate({ id: rec.id, status: e.target.value })}
                        className={`text-[10px] font-extrabold border border-slate-200 bg-white px-2 py-1 rounded-lg focus:outline-none ${
                          rec.status === 'Present' ? 'text-emerald-500 border-emerald-100' :
                          rec.status === 'Absent' ? 'text-rose-500 border-rose-100' :
                          'text-amber-500 border-amber-100'
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ==============================================
          STUDENT DASHBOARD INTERFACE
          ============================================== */}
      {!isTeacher && (
        <div className="flex flex-col gap-8">
          
          {studentSummaryLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400 font-bold">Compiling your attendance records...</span>
            </div>
          ) : !studentSummary || studentSummary.subjects?.length === 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-22 p-12 text-center shadow-sm flex flex-col items-center gap-3">
              <i className="ti ti-calendar-minus text-4xl text-slate-300"></i>
              <h3 className="text-base font-extrabold text-slate-700">No Attendance Marked Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm">Your teachers have not marked attendance logs for you on any subject yet. Once logged, your progress rings will show here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Overall percentage circle status card */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Circular Gauge Card */}
                <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col items-center gap-4 text-center">
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Overall Status</h3>
                  
                  {/* Premium circular gauge element */}
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-slate-100 fill-none"
                        strokeWidth="8"
                      />
                      {/* indicator circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className={`fill-none transition-all duration-500 ease-out ${getProgressColor(studentSummary.overall_percent)}`}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - studentSummary.overall_percent / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className={`text-4xl font-black tracking-tight ${getProgressBg(studentSummary.overall_percent)}`}>
                        {studentSummary.overall_percent}%
                      </span>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Presence</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      studentSummary.overall_percent >= 75.0 ? 'text-emerald-500' : 'text-rose-500 animate-pulse'
                    }`}>
                      {studentSummary.overall_percent >= 75.0 ? '✓ Excellent Standing' : '⚠ Action Required'}
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal max-w-[200px]">
                      {studentSummary.overall_percent >= 75.0 
                        ? 'Your attendance meets the university standards. Keep attending class!'
                        : 'Attendance is critically low. Missing further classes may result in academic warning.'}
                    </p>
                  </div>
                </div>

                {/* Low Attendance Warning Pulsing Alert Card */}
                {studentSummary.low_attendance_flag && (
                  <div className="rounded-22 bg-gradient-to-br from-amber-50 to-rose-50 border border-rose-200/50 p-6 flex gap-4 text-left shadow-lg shadow-rose-500/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <i className="ti ti-alert-triangle text-xl"></i>
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest">Attendance Warning</h4>
                      <p className="text-[10px] text-slate-600 font-medium leading-normal mt-1">
                        One or more subjects has fallen below the **75.0% presence threshold**. Please attend consecutive classes immediately to restore eligibility standing.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Detailed subject-wise breakdown progress bars */}
              <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Subject-wise Summary Metrics</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Audits of individual attended vs total classes logged.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {studentSummary.subjects.map((sub, idx) => {
                    const subPercent = sub.attendance_percent;
                    const isLow = subPercent < 75.0;
                    return (
                      <div 
                        key={idx} 
                        className={`border rounded-22 p-5 bg-slate-50 flex flex-col gap-4 text-left ${
                          isLow ? 'border-rose-200 shadow-sm shadow-rose-500/5 bg-rose-50/20' : 'border-slate-100 hover:border-indigo-200 transition-colors'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="truncate">
                            <h4 className="text-xs font-extrabold text-slate-700 truncate">{sub.subject}</h4>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Class Standing</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            isLow ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {isLow ? 'Low' : 'Good'}
                          </span>
                        </div>

                        {/* Fraction statistics */}
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-slate-700">{sub.classes_attended} / {sub.total_classes}</span>
                            <span className="text-[9px] font-semibold text-slate-400">Total Classes Attended</span>
                          </div>

                          <span className={`text-xl font-black ${isLow ? 'text-rose-500' : 'text-indigo-600'}`}>
                            {subPercent}%
                          </span>
                        </div>

                        {/* Linear horizontal progress indicator bar */}
                        <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLow ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                            }`}
                            style={{ width: `${subPercent}%` }}
                          ></div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
