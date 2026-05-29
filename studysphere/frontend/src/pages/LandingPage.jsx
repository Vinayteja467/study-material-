import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

// Custom Count Up Component using Framer Motion's useInView
const CountingStat = ({ target, suffix = '', duration = 1.5 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Easing function (easeOutQuad)
      const currentCount = Math.floor(progress * (2 - progress) * target);
      setCount(currentCount);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    window.requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] bg-clip-text text-transparent tracking-tight">
      {count}{suffix}
    </span>
  );
};

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track window scroll for fixed navbar shadow
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      setMobileMenuOpen(false);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#FFF8F0] min-h-screen text-slate-800 font-poppins relative overflow-x-hidden">
      
      {/* ================= SECTION 1: NAVBAR ================= */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff6b9d] to-[#c445ff] flex items-center justify-center text-white text-xl font-black shadow-md shadow-purple-500/10">
              S
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#1F2937]">
              Study<span className="bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] bg-clip-text text-transparent">Sphere</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">How it works</button>
            <button onClick={() => scrollToSection('about')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">About</button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-22 shadow-md shadow-pink-500/10 transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 text-[#1F2937] hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded-22 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-22 shadow-md shadow-pink-500/10 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Hamburger Icon */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-800 focus:outline-none transition-colors"
          >
            <i className={`ti ${mobileMenuOpen ? 'ti-x' : 'ti-menu-2'} text-xl`}></i>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-xl px-6 py-6 flex flex-col gap-5 md:hidden"
          >
            <button onClick={() => scrollToSection('features')} className="text-left text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-left text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">How it works</button>
            <button onClick={() => scrollToSection('about')} className="text-left text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">About</button>
            
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="w-full text-center py-3 bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] text-white text-xs font-bold uppercase tracking-wider rounded-22 shadow-md transition-all"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                    className="w-full text-center py-3 border border-slate-200 text-[#1F2937] hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded-22 transition-all"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                    className="w-full text-center py-3 bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] text-white text-xs font-bold uppercase tracking-wider rounded-22 shadow-md transition-all"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* ================= SECTION 2: HERO SECTION ================= */}
      <section className="min-h-screen relative pt-28 flex items-center justify-center overflow-hidden">
        {/* Soft floating background blob shapes */}
        <div className="absolute top-1/4 left-[-10%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-pink-300/15 to-purple-400/20 blur-3xl animate-pulse duration-5000"></div>
        <div className="absolute bottom-1/4 right-[-10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-cyan-300/15 to-[#5b86e5]/20 blur-3xl animate-pulse duration-7000"></div>

        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-10 gap-12 items-center relative z-10">
          {/* Left Text Block */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 text-left flex flex-col gap-6"
          >
            <div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#FFEBCC]/80 border border-[#FFEBCC] rounded-full text-xs font-black uppercase tracking-wider text-amber-700 shadow-sm">
                🤖 AI-Powered Learning Platform
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 leading-[1.15] tracking-tight">
              Learn Smarter with <span className="bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] bg-clip-text text-transparent">AI-Powered</span> Study Materials
            </h1>

            <p className="text-base sm:text-lg text-slate-500 leading-relaxed font-medium">
              Upload PDFs, get instant AI answers, track attendance, ace your exams — all in one platform built for modern students and teachers.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] hover:opacity-95 text-white text-xs font-black uppercase tracking-widest rounded-22 shadow-xl shadow-pink-500/20 hover:shadow-pink-500/30 transition-all flex items-center gap-2 group"
              >
                <span>Get Started Free</span>
                <i className="ti ti-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="px-7 py-4 border border-slate-200 hover:border-indigo-600 text-slate-700 hover:text-indigo-600 text-xs font-black uppercase tracking-widest rounded-22 hover:bg-indigo-50/10 transition-all flex items-center gap-2"
              >
                <i className="ti ti-player-play"></i>
                <span>Explore Features</span>
              </button>
            </div>

            {/* Inline Trust Badges */}
            <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
              <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-extrabold text-sm">✓</span> Free to use</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-extrabold text-sm">✓</span> No credit card</span>
              <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-extrabold text-sm">✓</span> AI-powered</span>
            </div>
          </motion.div>

          {/* Right Floating Mockup Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="lg:col-span-4 flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[340px] bg-[#1F2937] border border-slate-700 rounded-22 shadow-2xl p-6 flex flex-col gap-6 text-left transform hover:rotate-0 transition-transform duration-500 animate-float select-none">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Teacher Dashboard</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">StudySphere Portal</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
              </div>

              {/* Fake Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 border border-slate-800 rounded-xl flex flex-col justify-between h-24">
                  <span className="text-2xl font-black text-white">347</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Students Enrolled</span>
                </div>
                <div className="bg-slate-800/50 p-4 border border-slate-800 rounded-xl flex flex-col justify-between h-24">
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-[#36d1dc] to-[#5b86e5]">89</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Queries Today</span>
                </div>
              </div>

              {/* Progress and Recent Files */}
              <div className="bg-slate-800/40 p-4 border border-slate-800 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>12 Materials</span>
                  <span className="text-emerald-400 font-black">Online</span>
                </div>
                
                {/* Horizontal Stat Bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-gradient-to-r from-[#ff6b9d] to-[#c445ff]"></div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-500 font-black uppercase mt-1">
                  <span>Usage Status: Excellent</span>
                  <span>75% Full</span>
                </div>
              </div>

              {/* Bottom tag row */}
              <div className="flex items-center justify-between mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-800/80 pt-3">
                <span>Platform Status</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">Online</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 3: STATS BAR ================= */}
      <section className="bg-white py-16 border-y border-slate-100 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <CountingStat target={500} suffix="+" />
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Students Enrolled</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <CountingStat target={1200} suffix="+" />
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">AI Queries Solved</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <CountingStat target={300} suffix="+" />
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Study Materials</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <CountingStat target={98} suffix="%" />
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">User Satisfaction</span>
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: FEATURES SECTION ================= */}
      <section id="features" className="py-24 relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-16 text-center">
          <div className="flex flex-col gap-3 items-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight">Everything you need to learn better</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-wider">Modern academic toolkit integrated inside a single beautiful portal.</p>
          </div>

          {/* 6 Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            
            {/* Feature 1 */}
            <div className="bg-white border border-slate-100 rounded-22 p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#ff6b9d] to-[#c445ff] flex items-center justify-center text-white text-lg shadow-md">
                <i className="ti ti-brain"></i>
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">AI Q&A Chat</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Ask any question about your study material and get instant, highly accurate AI-powered answers from local context.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-slate-100 rounded-22 p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#36d1dc] to-[#5b86e5] flex items-center justify-center text-white text-lg shadow-md">
                <i className="ti ti-file-text"></i>
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">PDF Workspace</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Upload raw PDF curriculum documents and interact with them side-by-side using our split-screen workspace panel.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-slate-100 rounded-22 p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#f6d365] to-[#fda085] flex items-center justify-center text-white text-lg shadow-md">
                <i className="ti ti-calendar-event"></i>
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Attendance Tracker</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Track and manage subject-wise class attendance automatically, complete with automatic low attendance alerts.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-slate-100 rounded-22 p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#84fab0] to-[#8fd3f4] flex items-center justify-center text-white text-lg shadow-md">
                <i className="ti ti-clipboard-check"></i>
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Mock timed exams</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                AI-compiled timed mock examinations complete with real-time scoring, review sheets, and detailed explanation blocks.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-slate-100 rounded-22 p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#ff6b9d] to-[#c445ff] flex items-center justify-center text-white text-lg shadow-md">
                <i className="ti ti-cards"></i>
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Flashcards & MCQs</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Auto-generate interactive MCQ quizzes and flip-card carousel practice decks directly from study material PDFs using Gemini AI.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-slate-100 rounded-22 p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#36d1dc] to-[#5b86e5] flex items-center justify-center text-white text-lg shadow-md">
                <i className="ti ti-chart-bar"></i>
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Analytics Dashboard</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Review platform query statistics, subject engagement pie charts, and streak logs tracking student study schedules.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 5: HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-20 relative z-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-16 text-center">
          <div className="flex flex-col gap-3 items-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight">Get started in 3 simple steps</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-wider">How to unlock the power of AI learning in seconds.</p>
          </div>

          {/* Steps row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ff6b9d] to-[#c445ff] flex items-center justify-center text-white text-lg font-black shadow-lg">
                1
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight">Sign Up Profile</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-semibold">
                Create a secure account on the platform as a student or classroom teacher role.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#36d1dc] to-[#5b86e5] flex items-center justify-center text-white text-lg font-black shadow-lg">
                2
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight">Upload PDFs</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-semibold">
                Teachers upload PDF course files. Students browse the platform's global repository.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f6d365] to-[#fda085] flex items-center justify-center text-white text-lg font-black shadow-lg">
                3
              </div>
              <h4 className="text-sm font-black text-[#1F2937] uppercase tracking-tight">Learn with AI</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-semibold">
                Chat with documents, practice with auto-generated tests, and monitor your platform analytics.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 6: ROLE CARDS ================= */}
      <section id="about" className="py-24 relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-16 text-center">
          <div className="flex flex-col gap-3 items-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight">Built for everyone in your institution</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-wider">Tailored tools designed specifically for academic needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto w-full">
            
            {/* Teacher Card */}
            <div className="bg-gradient-to-br from-[#ff6b9d] to-[#c445ff] rounded-22 p-8 shadow-xl text-white transform hover:scale-[1.02] transition-transform duration-300 flex flex-col gap-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">For Teachers 👨‍🏫</h3>
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">Classroom Management & Timed Evaluations</p>
              </div>

              <div className="flex flex-col gap-3.5 text-xs font-semibold">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Upload and index syllabus PDF materials</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Track student daily classroom attendance</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Compile timed evaluation mock tests with Gemini</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Monitor overall class query engagement metrics</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Manage subject rosters and student profiles</span>
                </div>
              </div>
            </div>

            {/* Student Card */}
            <div className="bg-gradient-to-br from-[#36d1dc] to-[#5b86e5] rounded-22 p-8 shadow-xl text-white transform hover:scale-[1.02] transition-transform duration-300 flex flex-col gap-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">For Students 👩‍🎓</h3>
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">AI Guided Study & Interactive Practice</p>
              </div>

              <div className="flex flex-col gap-3.5 text-xs font-semibold">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Query AI chat assistant side-by-side with PDFs</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Practice with flip flashcard concepts carousel</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Take timed evaluations with real-time grading</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Review subject-wise class presence trackers</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  <span>Observe learning streaks and weak subject logs</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 7: CTA BANNER ================= */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-r from-[#ff6b9d] to-[#c445ff] z-20 text-white select-none">
        {/* Subtle dot mesh background overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 flex flex-col gap-6 items-center">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">Ready to transform how you learn?</h2>
          <p className="text-xs sm:text-sm text-white/80 font-bold uppercase tracking-wider max-w-lg leading-relaxed">
            Join hundreds of collegiate students and teachers already collaborating and testing using StudySphere AI.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3.5 bg-white hover:bg-slate-100 text-[#c445ff] text-xs font-black uppercase tracking-widest rounded-22 shadow-lg transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3.5 bg-white hover:bg-slate-100 text-[#c445ff] text-xs font-black uppercase tracking-widest rounded-22 shadow-lg transition-all"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3.5 border border-white/40 hover:border-white text-white hover:bg-white/10 text-xs font-black uppercase tracking-widest rounded-22 transition-all"
                >
                  Login to your account
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================= SECTION 8: FOOTER ================= */}
      <footer className="bg-[#1F2937] text-slate-400 py-16 relative z-20 select-none">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-12 text-left">
          
          {/* Column 1: Brand */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff6b9d] to-[#c445ff] flex items-center justify-center text-white text-lg font-black">
                S
              </div>
              <span className="text-lg font-black text-white uppercase tracking-tight">
                StudySphere
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              An intelligent, AI-integrated collaboration portal. Upload curricular documents, request instant answers, practice flashcard modules, and grade mock tests automatically.
            </p>

            <div className="flex gap-4 text-slate-400 text-lg mt-2">
              <i className="ti ti-brand-twitter hover:text-white cursor-pointer transition-colors"></i>
              <i className="ti ti-brand-github hover:text-white cursor-pointer transition-colors"></i>
              <i className="ti ti-brand-linkedin hover:text-white cursor-pointer transition-colors"></i>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h5 className="text-xs font-black text-white uppercase tracking-wider">Product</h5>
            <div className="flex flex-col gap-2.5 text-xs font-semibold">
              <span onClick={() => scrollToSection('features')} className="hover:text-white cursor-pointer transition-colors">Features</span>
              <span onClick={() => scrollToSection('how-it-works')} className="hover:text-white cursor-pointer transition-colors">How it works</span>
              <span className="hover:text-white cursor-pointer transition-colors">Pricing Options</span>
            </div>
          </div>

          {/* Column 3: Support */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h5 className="text-xs font-black text-white uppercase tracking-wider">Support</h5>
            <div className="flex flex-col gap-2.5 text-xs font-semibold">
              <span className="hover:text-white cursor-pointer transition-colors">Help Center</span>
              <span className="hover:text-white cursor-pointer transition-colors">Platform FAQ</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contact Support</span>
            </div>
          </div>

          {/* Column 4: Legal */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h5 className="text-xs font-black text-white uppercase tracking-wider">Legal</h5>
            <div className="flex flex-col gap-2.5 text-xs font-semibold">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Security Standards</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto px-6 border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>© 2026 StudySphere. Built with ❤️ for students everywhere.</span>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
            <span className="hover:text-white cursor-pointer transition-colors">Status Logs</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
