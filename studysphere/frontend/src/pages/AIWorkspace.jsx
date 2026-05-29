import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import { materialsAPI, chatAPI, mcqAPI } from '../api/client.js';

// Setup react-pdf worker fallback securely
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const AIWorkspace = () => {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // States for PDF Viewer
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  // States for AI Chat Panel Tabs
  const [rightPanelTab, setRightPanelTab] = useState('chat'); // 'chat' or 'practice'
  const [practiceTab, setPracticeTab] = useState('mcq'); // 'mcq' or 'flashcards'

  // MCQ generator states
  const [mcqTopic, setMcqTopic] = useState('General Overview');
  const [mcqCount, setMcqCount] = useState(5);
  const [mcqQuestions, setMcqQuestions] = useState([]); // Questions array
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({}); // { questionIndex: selectedOption }
  const [showExplanation, setShowExplanation] = useState(false);
  const [mcqGradeResult, setMcqGradeResult] = useState(null); // { score, total }
  const [isGeneratingMcq, setIsGeneratingMcq] = useState(false);

  // Flashcard generator states
  const [fcTopic, setFcTopic] = useState('Key Terms');
  const [fcCount, setFcCount] = useState(5);
  const [flashcards, setFlashcards] = useState([]); // Flashcards array [{front, back}]
  const [currentFcIndex, setCurrentFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingFc, setIsGeneratingFc] = useState(false);

  // States for AI Chat Space
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      text: "Hello! I am your StudySphere AI assistant. Ask me anything about this study document!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 1. Fetch Material Info
  const { data: material, isLoading: materialLoading } = useQuery({
    queryKey: ['materialDetail', materialId],
    queryFn: async () => {
      const res = await materialsAPI.retrieve(materialId);
      return res.data;
    },
    enabled: !!materialId,
  });

  const suggestionChips = [
    "Summarize this study material.",
    "What are the core concepts covered?",
    "Generate 3 practice questions from this."
  ];

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleSend = async (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setChatHistory((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await chatAPI.ask(materialId, textToSend);
      
      // Add AI Response
      const aiMessage = {
        role: 'ai',
        text: res.data.answer,
        timestamp: new Date()
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage = {
        role: 'ai',
        text: "Sorry, I encountered an indexing or server error. Make sure your Google Gemini API key is configured correctly in settings.",
        timestamp: new Date()
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // MCQ handler logic
  const handleGenerateMcq = async (e) => {
    e.preventDefault();
    setIsGeneratingMcq(true);
    setMcqGradeResult(null);
    setMcqAnswers({});
    setCurrentMcqIndex(0);
    setShowExplanation(false);

    try {
      const res = await mcqAPI.generate(materialId, mcqTopic, mcqCount);
      setMcqQuestions(res.data.questions);
    } catch (err) {
      alert('Failed to generate MCQs. Please verify Gemini configuration.');
    } finally {
      setIsGeneratingMcq(false);
    }
  };

  const handleGradeMcq = async () => {
    let score = 0;
    const total = mcqQuestions.length;
    const answersLog = [];

    mcqQuestions.forEach((q, idx) => {
      const selected = mcqAnswers[idx] || '';
      const isCorrect = selected.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      if (isCorrect) score += 1;
      answersLog.push({
        question: q.question,
        selected,
        correct: q.correct_answer,
        is_correct: isCorrect,
      });
    });

    setMcqGradeResult({ score, total });

    try {
      await mcqAPI.save({
        pdf_id: parseInt(materialId),
        topic: mcqTopic,
        score,
        total,
        answers: answersLog,
      });
    } catch (err) {
      console.error('Failed to save quiz results to database:', err);
    }
  };

  // Flashcards handler logic
  const handleGenerateFc = async (e) => {
    e.preventDefault();
    setIsGeneratingFc(true);
    setCurrentFcIndex(0);
    setIsFlipped(false);

    try {
      const res = await mcqAPI.generateFlashcards(materialId, fcTopic, fcCount);
      setFlashcards(res.data);
    } catch (err) {
      alert('Failed to generate flashcards. Please verify Gemini configuration.');
    } finally {
      setIsGeneratingFc(false);
    }
  };

  if (materialLoading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0] font-poppins">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Loading AI Study Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-poppins bg-[#FFF8F0]">
      
      {/* Workspace top navigation bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors"
          >
            <i className="ti ti-arrow-left text-lg"></i>
          </button>
          <div className="text-left">
            <h2 className="text-sm font-extrabold text-slate-800 truncate max-w-[300px]">{material?.title}</h2>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{material?.subject}</p>
          </div>
        </div>

        {/* PDF Controls */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-xl">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            className="text-xs font-bold text-slate-600 disabled:text-slate-300 hover:text-indigo-600"
          >
            <i className="ti ti-chevron-left"></i> Prev
          </button>
          <span className="text-xs font-semibold text-slate-500">
            Page {pageNumber} of {numPages || '...'}
          </span>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
            className="text-xs font-bold text-slate-600 disabled:text-slate-300 hover:text-indigo-600"
          >
            Next <i className="ti ti-chevron-right"></i>
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600"
          >
            <i className="ti ti-minus"></i>
          </button>
          <span className="text-xs font-semibold text-slate-500">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600"
          >
            <i className="ti ti-plus"></i>
          </button>
        </div>

        <div className="text-xs font-bold text-slate-500 hidden sm:block">
          Teacher: {material?.uploaded_by_name}
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-grow flex overflow-hidden min-h-0">
        
        {/* Left Side: PDF Document Viewer */}
        <div className="w-1/2 h-full overflow-y-auto p-6 bg-[#f1f3f5] border-r border-slate-200 select-none flex flex-col items-center">
          {material?.file ? (
            <Document
              file={material.file}
              onLoadSuccess={handleDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center gap-2 mt-20">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-slate-400">Loading document pages...</span>
                </div>
              }
              className="flex flex-col items-center gap-4 w-full"
            >
              {numPages ? (
                Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    scale={zoom}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    className="mb-4 shadow-md rounded-xl"
                  />
                ))
              ) : (
                <Page pageNumber={pageNumber} scale={zoom} renderAnnotationLayer={false} renderTextLayer={false} className="shadow-md rounded-xl" />
              )}
            </Document>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-2 mt-20">
              <i className="ti ti-file-alert text-3xl"></i>
              <span className="text-xs font-bold">Failed to load PDF path.</span>
            </div>
          )}
        </div>

        {/* Right Side: Tab-Controlled Assistant Panel */}
        <div className="w-1/2 h-full flex flex-col justify-between bg-slate-50 select-none">
          
          {/* Top Tabs selector */}
          <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 gap-6 select-none">
            <button
              onClick={() => setRightPanelTab('chat')}
              className={`flex items-center gap-1.5 pb-2.5 pt-3.5 text-xs font-extrabold uppercase tracking-wider relative transition-all ${
                rightPanelTab === 'chat' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className="ti ti-messages"></i>
              AI Chat
              {rightPanelTab === 'chat' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setRightPanelTab('practice')}
              className={`flex items-center gap-1.5 pb-2.5 pt-3.5 text-xs font-extrabold uppercase tracking-wider relative transition-all ${
                rightPanelTab === 'practice' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className="ti ti-clipboard-list"></i>
              AI Practice
              {rightPanelTab === 'practice' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></span>
              )}
            </button>
          </div>

          {/* ==============================================
              PANEL 1: AI CHAT SPACE (Original feature)
              ============================================== */}
          {rightPanelTab === 'chat' && (
            <div className="flex-grow flex flex-col justify-between overflow-hidden">
              {/* Chat Timeline scroll container */}
              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[80%] ${
                      msg.role === 'user' ? 'self-end items-end' : 'self-start items-start text-left'
                    }`}
                  >
                    <div className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-600/5'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-semibold">
                      {msg.role === 'user' ? 'You' : 'StudySphere AI'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="self-start flex flex-col items-start gap-1">
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none flex items-center gap-1 shadow-sm">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold">Gemini Flash is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Control Box */}
              <div className="bg-white border-t border-slate-200 p-4 flex flex-col gap-3 shrink-0 select-none">
                
                {/* Suggestion Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
                  {suggestionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip)}
                      className="py-1.5 px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold whitespace-nowrap snap-start transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                  className="flex gap-2 w-full"
                >
                  <input
                    type="text"
                    placeholder="Ask something about this PDF..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center shrink-0"
                  >
                    Send <i className="ti ti-send ml-1"></i>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==============================================
              PANEL 2: AI PRACTICE WORKSPACE
              ============================================== */}
          {rightPanelTab === 'practice' && (
            <div className="flex-grow flex flex-col justify-between overflow-hidden">
              
              {/* Secondary Practice sub-mode switcher */}
              <div className="flex justify-start bg-slate-100/50 border-b border-slate-200/55 px-4 py-2 shrink-0 select-none">
                <button
                  onClick={() => setPracticeTab('mcq')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    practiceTab === 'mcq' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  MCQs Quiz
                </button>
                <button
                  onClick={() => setPracticeTab('flashcards')}
                  className={`ml-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    practiceTab === 'flashcards' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Concept Cards
                </button>
              </div>

              {/* Sub-tab viewport */}
              <div className="flex-grow overflow-y-auto p-6 flex flex-col justify-between">
                
                {/* 2.1 MCQ Quiz Generator and Engine */}
                {practiceTab === 'mcq' && (
                  <div className="flex flex-col gap-5 text-left h-full justify-between">
                    
                    {/* Setup Quiz Config Form */}
                    {mcqQuestions.length === 0 && !isGeneratingMcq && (
                      <div className="flex flex-col gap-4 self-center max-w-sm w-full my-auto">
                        <div className="text-center flex flex-col items-center gap-1">
                          <i className="ti ti-brain-academic text-3xl text-indigo-600 bg-indigo-50 p-3 rounded-22 shadow-sm"></i>
                          <h4 className="text-sm font-extrabold text-slate-800 uppercase mt-2">AI Quiz Maker</h4>
                          <p className="text-[11px] text-slate-400 font-medium">Formulate immediate mock check sheets on subject topics.</p>
                        </div>

                        <form onSubmit={handleGenerateMcq} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Topic Scope</label>
                            <input
                              type="text"
                              value={mcqTopic}
                              onChange={(e) => setMcqTopic(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Question Pool Count</label>
                            <select
                              value={mcqCount}
                              onChange={(e) => setMcqCount(parseInt(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                            >
                              <option value={5}>5 Questions</option>
                              <option value={10}>10 Questions</option>
                              <option value={15}>15 Questions</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md uppercase tracking-wider transition-all hover:opacity-95"
                          >
                            Generate Questions
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Quiz loading states */}
                    {isGeneratingMcq && (
                      <div className="flex flex-col items-center justify-center gap-3 my-auto mx-auto text-slate-400">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">Gemini is compiling your MCQ list...</span>
                      </div>
                    )}

                    {/* Active quiz taking panel */}
                    {mcqQuestions.length > 0 && !mcqGradeResult && (
                      <div className="flex flex-col justify-between h-full w-full gap-5">
                        
                        {/* Upper progress bar */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            <span>Topic: {mcqTopic}</span>
                            <span>{currentMcqIndex + 1} of {mcqQuestions.length} Questions</span>
                          </div>
                          <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${((currentMcqIndex + 1) / mcqQuestions.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Question Text block */}
                        <div className="flex flex-col gap-4 text-left overflow-y-auto pr-1">
                          <h4 className="text-xs font-black text-slate-800 leading-normal">
                            {mcqQuestions[currentMcqIndex].question}
                          </h4>

                          {/* Choices clickable list */}
                          <div className="flex flex-col gap-2.5 mt-1">
                            {mcqQuestions[currentMcqIndex].options.map((opt, oIdx) => {
                              const isSelected = mcqAnswers[currentMcqIndex] === opt;
                              const isCorrectAnswer = opt === mcqQuestions[currentMcqIndex].correct_answer;
                              const hasUserSelectedAnything = mcqAnswers[currentMcqIndex] !== undefined;

                              let cardColor = 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600';
                              let badgeColor = 'bg-slate-200 text-slate-500';

                              if (hasUserSelectedAnything) {
                                if (isSelected) {
                                  if (isCorrectAnswer) {
                                    cardColor = 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm';
                                    badgeColor = 'bg-emerald-500 text-white';
                                  } else {
                                    cardColor = 'border-rose-300 bg-rose-50 text-rose-800 shadow-sm';
                                    badgeColor = 'bg-rose-500 text-white';
                                  }
                                } else if (isCorrectAnswer) {
                                  cardColor = 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm';
                                  badgeColor = 'bg-emerald-500 text-white';
                                } else {
                                  cardColor = 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60';
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  disabled={hasUserSelectedAnything}
                                  onClick={() => {
                                    handleStatusChange(currentMcqIndex, opt); // reusing local status changer
                                    setMcqAnswers(prev => ({ ...prev, [currentMcqIndex]: opt }));
                                    setShowExplanation(true);
                                  }}
                                  className={`w-full p-3.5 border rounded-22 text-left text-xs font-semibold flex items-center gap-2.5 transition-all duration-200 ${cardColor}`}
                                >
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${badgeColor}`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {/* Instant Explanation banner */}
                          {showExplanation && mcqAnswers[currentMcqIndex] && (
                            <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-22 flex flex-col gap-1 text-[10px] text-slate-500 font-medium leading-normal animate-fadeIn">
                              <span className="font-extrabold text-indigo-700 uppercase tracking-widest text-[9px]">AI Review</span>
                              <p className="italic">"{mcqQuestions[currentMcqIndex].explanation}"</p>
                            </div>
                          )}
                        </div>

                        {/* Nav controls */}
                        <div className="flex justify-between items-center border-t border-slate-100 pt-4 shrink-0">
                          <button
                            onClick={() => {
                              setCurrentMcqIndex(p => Math.max(0, p - 1));
                              setShowExplanation(mcqAnswers[currentMcqIndex - 1] !== undefined);
                            }}
                            disabled={currentMcqIndex === 0}
                            className="px-4 py-1.5 border border-slate-200 hover:border-slate-300 disabled:opacity-30 rounded-xl text-xs font-bold text-slate-500 transition-colors"
                          >
                            Prev
                          </button>
                          
                          {currentMcqIndex < mcqQuestions.length - 1 ? (
                            <button
                              onClick={() => {
                                setCurrentMcqIndex(p => Math.min(mcqQuestions.length - 1, p + 1));
                                setShowExplanation(mcqAnswers[currentMcqIndex + 1] !== undefined);
                              }}
                              disabled={mcqAnswers[currentMcqIndex] === undefined}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-colors"
                            >
                              Next
                            </button>
                          ) : (
                            <button
                              onClick={handleGradeMcq}
                              disabled={mcqAnswers[currentMcqIndex] === undefined}
                              className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-all"
                            >
                              Grade Quiz
                            </button>
                          )}
                        </div>

                      </div>
                    )}

                    {/* Quiz Grading modal overview */}
                    {mcqGradeResult && (
                      <div className="flex flex-col items-center justify-center gap-6 my-auto text-center w-full animate-scaleIn">
                        
                        {/* Score badges */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quiz Results</span>
                          <h3 className="text-4xl font-black text-slate-800">
                            {mcqGradeResult.score} / {mcqGradeResult.total}
                          </h3>
                        </div>

                        {/* Custom visual pass/fail gradients */}
                        {mcqGradeResult.score / mcqGradeResult.total >= 0.6 ? (
                          <div className="rounded-22 bg-gradient-to-br from-emerald-400 to-cyan-500 text-white px-5 py-3 shadow-md shadow-emerald-500/10 text-xs font-black uppercase tracking-wider animate-bounce">
                            ✓ Passed! standing
                          </div>
                        ) : (
                          <div className="rounded-22 bg-gradient-to-br from-pink-500 to-purple-600 text-white px-5 py-3 shadow-md shadow-pink-500/10 text-xs font-black uppercase tracking-wider animate-bounce">
                            ⚠ Failed! retry
                          </div>
                        )}

                        <p className="text-xs text-slate-400 font-medium max-w-xs leading-normal">
                          {mcqGradeResult.score / mcqGradeResult.total >= 0.6
                            ? 'Excellent standing! You passed this quiz. Keep indexing other pages.'
                            : 'Score is below 60%. We recommend revising the PDF document and trying again.'}
                        </p>

                        <button
                          onClick={() => setMcqQuestions([])}
                          className="px-6 py-2 border border-slate-200 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          Take Another Quiz
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* 2.2 Concept Cards Generator and flips deck */}
                {practiceTab === 'flashcards' && (
                  <div className="flex flex-col gap-5 text-left h-full justify-between select-none">
                    
                    {/* Setup Config form */}
                    {flashcards.length === 0 && !isGeneratingFc && (
                      <div className="flex flex-col gap-4 self-center max-w-sm w-full my-auto">
                        <div className="text-center flex flex-col items-center gap-1">
                          <i className="ti ti-cards text-3xl text-indigo-600 bg-indigo-50 p-3 rounded-22 shadow-sm animate-pulse"></i>
                          <h4 className="text-sm font-extrabold text-slate-800 uppercase mt-2">Concept Cards</h4>
                          <p className="text-[11px] text-slate-400 font-medium">AI compiles flipping key terms decks to review concepts.</p>
                        </div>

                        <form onSubmit={handleGenerateFc} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Focus Concept Scope</label>
                            <input
                              type="text"
                              value={fcTopic}
                              onChange={(e) => setFcTopic(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Flashcards Strength</label>
                            <select
                              value={fcCount}
                              onChange={(e) => setFcCount(parseInt(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                            >
                              <option value={5}>5 Flashcards</option>
                              <option value={10}>10 Flashcards</option>
                              <option value={15}>15 Flashcards</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md uppercase tracking-wider transition-all hover:opacity-95"
                          >
                            Compile Concept Cards
                          </button>
                        </form>
                      </div>
                    )}

                    {/* loading card decks */}
                    {isGeneratingFc && (
                      <div className="flex flex-col items-center justify-center gap-3 my-auto mx-auto text-slate-400">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">Gemini is compiling card decks...</span>
                      </div>
                    )}

                    {/* Flashcards flip console */}
                    {flashcards.length > 0 && (
                      <div className="flex flex-col justify-between h-full w-full gap-6 select-none">
                        
                        {/* Upper slide counter */}
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
                          <span>Topic: {fcTopic}</span>
                          <span>{currentFcIndex + 1} of {flashcards.length} Cards</span>
                        </div>

                        {/* Interactive flipping card container */}
                        <div 
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="relative w-full aspect-[4/3] max-w-sm mx-auto cursor-pointer select-none group"
                          style={{ perspective: '1000px' }}
                        >
                          <div 
                            className="relative w-full h-full duration-500 transform-style-3d"
                            style={{ 
                              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                              transformStyle: 'preserve-3d'
                            }}
                          >
                            
                            {/* FRONT SIDE (warm elegant gradient background) */}
                            <div 
                              className="absolute inset-0 w-full h-full rounded-22 bg-gradient-to-br from-pink-500 to-purple-600 text-white flex flex-col justify-center items-center p-6 shadow-lg shadow-pink-500/10"
                              style={{ backfaceVisibility: 'hidden' }}
                            >
                              <div className="flex flex-col items-center justify-center gap-2 h-full text-center">
                                <span className="text-[10px] font-black text-pink-200 uppercase tracking-widest">Concept Card</span>
                                <h3 className="text-sm font-black leading-snug">{flashcards[currentFcIndex].front}</h3>
                                <span className="text-[9px] text-pink-200 mt-4 font-bold border border-white/20 px-2.5 py-1 rounded-xl">Click to Flip</span>
                              </div>
                            </div>

                            {/* BACK SIDE (clean robust white board) */}
                            <div 
                              className="absolute inset-0 w-full h-full rounded-22 bg-white border border-slate-200 text-slate-700 flex flex-col justify-center items-center p-6 shadow-sm"
                              style={{ 
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)'
                              }}
                            >
                              <div className="flex flex-col items-center justify-center gap-2 h-full text-center">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">AI Explanation</span>
                                <p className="text-xs font-bold leading-normal text-slate-600">{flashcards[currentFcIndex].back}</p>
                                <span className="text-[9px] text-slate-400 mt-4 font-bold border border-slate-200 px-2.5 py-1 rounded-xl">Click to Flip</span>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Controls prev/next carousel */}
                        <div className="flex justify-between items-center border-t border-slate-100 pt-4 shrink-0">
                          <button
                            onClick={() => {
                              setCurrentFcIndex(p => Math.max(0, p - 1));
                              setIsFlipped(false);
                            }}
                            disabled={currentFcIndex === 0}
                            className="px-4 py-1.5 border border-slate-200 hover:border-slate-300 disabled:opacity-30 rounded-xl text-xs font-bold text-slate-500 transition-colors"
                          >
                            Prev
                          </button>
                          
                          <button
                            onClick={() => setFlashcards([])}
                            className="px-3.5 py-1 text-[10px] font-extrabold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider"
                          >
                            Reset Deck
                          </button>

                          <button
                            onClick={() => {
                              setCurrentFcIndex(p => Math.min(flashcards.length - 1, p + 1));
                              setIsFlipped(false);
                            }}
                            disabled={currentFcIndex === flashcards.length - 1}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-colors"
                          >
                            Next
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

        </div>


      </div>

    </div>
  );
};
