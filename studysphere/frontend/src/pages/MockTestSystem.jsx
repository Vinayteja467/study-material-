import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { testAPI, materialsAPI } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.jsx';

export const MockTestSystem = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTeacher = user?.role === 'Teacher';

  // State management
  const [activeTest, setActiveTest] = useState(null); // The test details object currently taking
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({}); // { questionId: selectedOptionText }
  const [flaggedQuestions, setFlaggedQuestions] = useState([]); // Array of questionIds
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [examStarted, setExamStarted] = useState(false);
  const [examCompletedResult, setExamCompletedResult] = useState(null); // The attempt result data
  const [timeTakenTotal, setTimeTakenTotal] = useState(0);

  // Form states for Teacher view
  const [selectedPdfId, setSelectedPdfId] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Fetch Materials List (for PDF selection in Teacher generator)
  const { data: materials } = useQuery({
    queryKey: ['teacherMaterialsForTests'],
    queryFn: async () => {
      const res = await materialsAPI.list();
      return res.data;
    },
    enabled: isTeacher,
  });

  // Automatically pre-select first PDF once loaded
  useEffect(() => {
    if (materials && materials.length > 0 && !selectedPdfId) {
      setSelectedPdfId(materials[0].id.toString());
    }
  }, [materials, selectedPdfId]);

  // 2. Fetch Mock Tests List (for Student/Teacher viewing)
  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['testsList'],
    queryFn: async () => {
      const res = await testAPI.list();
      return res.data;
    },
  });

  // 3. Create Mock Test Mutation (Teacher AI Generation)
  const createTestMutation = useMutation({
    mutationFn: async (payload) => {
      return testAPI.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testsList'] });
      setTestTitle('');
      setTimeLimitMinutes(30);
      setQuestionCount(10);
      alert('Mock Test successfully compiled and published using Gemini AI!');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to generate Mock Test.');
    },
  });

  // 4. Fetch Active Test details (Student exam portal)
  const loadActiveTest = async (testId) => {
    try {
      const res = await testAPI.retrieve(testId);
      setActiveTest(res.data);
      setTimeLeft(res.data.time_limit_minutes * 60);
      setStudentAnswers({});
      setFlaggedQuestions([]);
      setActiveQuestionIndex(0);
      setExamStarted(true);
      setExamCompletedResult(null);
    } catch (err) {
      alert('Failed to load exam details.');
    }
  };

  // 5. Submit Attempt Mutation
  const submitAttemptMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return testAPI.attempt(id, payload);
    },
    onSuccess: (res) => {
      setExamCompletedResult(res.data);
      setExamStarted(false);
      queryClient.invalidateQueries({ queryKey: ['testsList'] });
    },
    onError: (err) => {
      alert('Failed to grade attempt.');
    },
  });

  // Live Timer Countdown Effect
  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  // Keep track of time elapsed
  useEffect(() => {
    if (!examStarted) return;
    const interval = setInterval(() => {
      setTimeTakenTotal(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted]);

  const handleGenerateTest = (e) => {
    e.preventDefault();
    if (!testTitle.trim() || !selectedPdfId) return;
    setIsGenerating(true);
    createTestMutation.mutate({
      pdf_id: parseInt(selectedPdfId),
      title: testTitle,
      time_limit_minutes: timeLimitMinutes,
      question_count: questionCount,
    }, {
      onSettled: () => setIsGenerating(false)
    });
  };

  const handleSelectAnswer = (questionId, optionText) => {
    setStudentAnswers(prev => ({ ...prev, [questionId]: optionText }));
  };

  const handleFlagToggle = (questionId) => {
    setFlaggedQuestions(prev => 
      prev.includes(questionId) ? prev.filter(q => q !== questionId) : [...prev, questionId]
    );
  };

  const handleAutoSubmit = () => {
    if (!activeTest) return;
    alert('Time limit expired! Auto-submitting answers...');
    triggerSubmission();
  };

  const triggerSubmission = () => {
    submitAttemptMutation.mutate({
      id: activeTest.id,
      payload: {
        answers: studentAnswers,
        time_taken_seconds: timeTakenTotal,
      }
    });
  };

  const formatTimer = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  // Node coloring helpers inside Exam Workspace
  const getNodeColor = (index, qId) => {
    const isAnswered = studentAnswers[qId] !== undefined;
    const isFlagged = flaggedQuestions.includes(qId);
    const isActive = activeQuestionIndex === index;

    if (isActive) return 'border-2 border-indigo-600 bg-indigo-50 text-indigo-600 font-extrabold shadow-smScale';
    if (isFlagged) return 'bg-amber-400 text-white font-bold';
    if (isAnswered) return 'bg-emerald-500 text-white font-bold';
    return 'bg-slate-200 text-slate-500 hover:bg-slate-300';
  };

  return (
    <div className="flex flex-col gap-8 w-full p-6 text-left font-poppins bg-[#FFF8F0] min-h-screen">
      
      {/* ==============================================
          EXAM IN-PROGRESS FULLSCREEN WORKSPACE
          ============================================== */}
      {examStarted && activeTest && (
        <div className="fixed inset-0 z-50 bg-[#FFF8F0] overflow-y-auto flex flex-col p-6">
          
          {/* Workspace Upper Header Bar */}
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-4 mb-6">
            <div className="text-left">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight uppercase">{activeTest.title}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Mock Evaluation • Source: {activeTest.material_title}</p>
            </div>

            {/* Countdown timer with red-warning trigger */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time Remaining</span>
                <span className={`text-2xl font-black tracking-tighter tabular-nums ${
                  timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-indigo-600'
                }`}>
                  {formatTimer(timeLeft)}
                </span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to finish and submit the exam? Any unsubmitted questions will be graded as incorrect.')) {
                    triggerSubmission();
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold uppercase tracking-widest rounded-22 shadow-lg shadow-pink-500/10 transition-all"
              >
                Finish Exam
              </button>
            </div>
          </div>

          {/* Main workspace splits */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
            
            {/* Left 3/4 Column: Active question sheet */}
            <div className="lg:col-span-3 flex flex-col justify-between bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm min-h-[420px]">
              
              {/* Question Text block */}
              <div className="flex flex-col gap-6 text-left">
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 font-extrabold text-[10px] uppercase">
                    Question {activeQuestionIndex + 1} of {activeTest.questions.length}
                  </span>
                  
                  {/* Flag button */}
                  <button
                    onClick={() => handleFlagToggle(activeTest.questions[activeQuestionIndex].id)}
                    className={`flex items-center gap-1 px-3 py-1 border rounded-lg text-[10px] font-extrabold transition-colors ${
                      flaggedQuestions.includes(activeTest.questions[activeQuestionIndex].id)
                        ? 'bg-amber-50 border-amber-200 text-amber-500'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <i className="ti ti-flag"></i>
                    {flaggedQuestions.includes(activeTest.questions[activeQuestionIndex].id) ? 'Flagged' : 'Flag for Review'}
                  </button>
                </div>

                <h2 className="text-base font-extrabold text-slate-800 leading-snug">
                  {activeTest.questions[activeQuestionIndex].question}
                </h2>

                {/* 4 Choices grid */}
                <div className="flex flex-col gap-3">
                  {activeTest.questions[activeQuestionIndex].options.map((option, idx) => {
                    const isSelected = studentAnswers[activeTest.questions[activeQuestionIndex].id] === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(activeTest.questions[activeQuestionIndex].id, option)}
                        className={`w-full flex items-center gap-3 p-4 border rounded-22 text-left text-xs font-semibold transition-all duration-200 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 shadow-sm'
                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation button strip */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-6">
                <button
                  onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIndex === 0}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-300 disabled:opacity-30 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Previous
                </button>
                
                {activeQuestionIndex < activeTest.questions.length - 1 ? (
                  <button
                    onClick={() => setActiveQuestionIndex(prev => Math.min(activeTest.questions.length - 1, prev + 1))}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm('This is the final question. Submit exam?')) {
                        triggerSubmission();
                      }
                    }}
                    className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-extrabold uppercase shadow transition-colors"
                  >
                    Submit Exam
                  </button>
                )}
              </div>

            </div>

            {/* Right 1/4 Column: Question Palette palette */}
            <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-5">
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Question Navigation</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Audits of visited, flagged, or answered nodes.</p>
              </div>

              {/* Node palette circle grid */}
              <div className="grid grid-cols-5 gap-2.5 select-none">
                {activeTest.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all ${getNodeColor(idx, q.id)}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Color legend guide block */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-slate-200"></span>
                  <span>Unvisited</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500"></span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400"></span>
                  <span>Flagged Review</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ==============================================
          EXAM RESULTS COMPLETED DETAILS SCREEN
          ============================================== */}
      {examCompletedResult && (
        <div className="fixed inset-0 z-50 bg-[#FFF8F0] overflow-y-auto flex flex-col p-6 items-center">
          
          <div className="max-w-3xl w-full flex flex-col gap-8">
            
            {/* Header results score card */}
            <div className="bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-sm">
                <i className="ti ti-checkbox"></i>
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-800 uppercase">Mock Exam Complete!</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Answers auto-graded in real-time</p>
              </div>

              {/* Stats values */}
              <div className="flex gap-12 mt-2">
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-slate-800">{examCompletedResult.score} / {examCompletedResult.total}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Correct Answers</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-indigo-600">{examCompletedResult.percentage}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Performance Score</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-slate-800">{formatDuration(examCompletedResult.time_taken_seconds)}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time Taken</span>
                </div>
              </div>

              <button
                onClick={() => setExamCompletedResult(null)}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all hover:opacity-95"
              >
                Close & Return Dashboard
              </button>
            </div>

            {/* Answer review worksheets lists */}
            <div className="flex flex-col gap-4 text-left">
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Question Review Sheets</h3>
              
              {examCompletedResult.review.map((item, idx) => {
                const isCorrect = item.is_correct;
                return (
                  <div 
                    key={idx} 
                    className={`bg-white border rounded-22 p-6 shadow-sm flex flex-col gap-4 text-left ${
                      isCorrect ? 'border-emerald-200' : 'border-rose-200 bg-rose-50/5'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-400">
                        Question {idx + 1}
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-800 leading-snug">{item.question}</h4>

                    {/* Displays 4 option fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {item.options.map((opt, oIdx) => {
                        const isSelected = item.selected_answer === opt;
                        const isCorrectOpt = item.correct_answer === opt;
                        return (
                          <div
                            key={oIdx}
                            className={`p-3 border rounded-22 text-xs font-semibold flex items-center gap-2.5 ${
                              isCorrectOpt ? 'border-emerald-300 bg-emerald-50/20 text-emerald-800' :
                              isSelected ? 'border-rose-300 bg-rose-50/20 text-rose-800' :
                              'border-slate-50 bg-slate-50/50 text-slate-500'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isCorrectOpt ? 'bg-emerald-500 text-white' :
                              isSelected ? 'bg-rose-500 text-white' :
                              'bg-slate-200 text-slate-400'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanations text block */}
                    {item.explanation && (
                      <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-1 text-[11px] leading-normal text-slate-500 font-medium">
                        <span className="font-extrabold text-slate-700 uppercase tracking-widest text-[9px]">AI Explanation Review</span>
                        <p className="italic">"{item.explanation}"</p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ==============================================
          MAIN SCREEN: MOCK TESTS DIRECTORY / MAKER
          ============================================== */}
      {!examStarted && !examCompletedResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Teacher Timed exam maker */}
          {isTeacher && (
            <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-22 p-6 shadow-sm flex flex-col gap-4 self-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">AI Test Timed Generator</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Select a PDF material and let Gemini create mock evaluations.</p>
              </div>

              <form onSubmit={handleGenerateTest} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Source Material</label>
                  <select
                    value={selectedPdfId}
                    onChange={(e) => setSelectedPdfId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    {!materials || materials.length === 0 ? (
                      <option value="">No PDFs available</option>
                    ) : (
                      materials.map(m => (
                        <option key={m.id} value={m.id}>{m.title} ({m.subject})</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Evaluation Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm Physics Quiz"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Time Limit (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Question Size</label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !selectedPdfId}
                  className="py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold rounded-22 shadow-lg shadow-pink-500/10 uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing PDF with Gemini...</span>
                    </div>
                  ) : 'Compile AI Mock Exam'}
                </button>
              </form>
            </div>
          )}

          {/* Right/Main panel: Mock tests directory grid list */}
          <div className={`${isTeacher ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col gap-6 text-left`}>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Active Mock Test Evaluations</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Audits of available timed testing archives and high score logs.</p>
            </div>

            {testsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
              </div>
            ) : !tests || tests.length === 0 ? (
              <div className="bg-white border border-slate-200/60 rounded-22 p-12 text-center shadow-sm flex flex-col items-center gap-3">
                <i className="ti ti-clipboard-list text-3xl text-slate-300 animate-pulse"></i>
                <span className="text-xs text-slate-400 font-bold">No mock tests published yet.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tests.map((test) => {
                  const hasAttempted = test.has_attempted || false;
                  return (
                    <div 
                      key={test.id} 
                      className="bg-white border border-slate-200/60 rounded-22 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 text-left group"
                    >
                      <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="truncate">
                            <h4 className="text-xs font-black text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{test.title}</h4>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate block mt-0.5">Source: {test.material_title}</span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shrink-0 ${
                            hasAttempted ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'
                          }`}>
                            {hasAttempted ? 'Attempted' : 'New'}
                          </span>
                        </div>

                        {/* Specs strip */}
                        <div className="flex gap-4 text-[10px] font-semibold text-slate-400 uppercase mt-1">
                          <div className="flex items-center gap-1">
                            <i className="ti ti-file-certificate"></i>
                            <span>{test.questions?.length || 10} Questions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <i className="ti ti-hourglass"></i>
                            <span>{test.time_limit_minutes} minutes</span>
                          </div>
                        </div>
                      </div>

                      {/* Button and High score display row */}
                      <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-1">
                        {hasAttempted ? (
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Your High Score</span>
                            <span className="text-xs font-black text-indigo-600 leading-none mt-0.5">
                              {test.best_score} / {test.questions?.length || 10} correct
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Not Attempted</span>
                        )}

                        {!isTeacher ? (
                          <button
                            onClick={() => loadActiveTest(test.id)}
                            className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Start Test
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium italic">Creator: {test.creator_name}</span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
