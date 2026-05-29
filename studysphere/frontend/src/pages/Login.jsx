import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authAPI } from '../api/client.js';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login States
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register States
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regRole, setRegRole] = useState('Student');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regPic, setRegPic] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUser || !loginPass) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login({
        username: loginUser,
        password: loginPass,
      });

      const { access, refresh } = res.data;
      
      // Fetch user profile info
      localStorage.setItem('access_token', access);
      const meRes = await authAPI.me();
      login(meRes.data, access, refresh);
      
      const role = meRes.data.role;
      if (role === 'Teacher') navigate('/teacher');
      else if (role === 'Student') navigate('/student');
      else if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regUser || !regEmail || !regPass) {
      setError('Please fill in all required fields (username, email, password)');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', regUser);
      formData.append('email', regEmail);
      formData.append('password', regPass);
      formData.append('role', regRole);
      formData.append('first_name', regFirstName);
      formData.append('last_name', regLastName);
      formData.append('bio', regBio);
      if (regPic) {
        formData.append('profile_picture', regPic);
      }

      const res = await authAPI.register(formData);
      const { user, access, refresh } = res.data;
      login(user, access, refresh);
      
      const role = user.role;
      if (role === 'Teacher') navigate('/teacher');
      else if (role === 'Student') navigate('/student');
      else if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0] p-6 font-poppins relative overflow-hidden">
      
      {/* Dynamic Background Mesh */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-pink-300/20 to-purple-400/25 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cyan-300/20 to-indigo-400/25 blur-3xl"></div>

      <div className="w-full max-w-lg bg-white/70 backdrop-blur-md border border-white/50 rounded-22 shadow-2xl p-8 relative z-10">
        
        {/* Brand Banner */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg mb-3">
            S
          </div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent uppercase tracking-tight">
            StudySphere
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            AI-Integrated Academic Collaboration Platform
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-grow py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-grow py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-500 text-left">
            <i className="ti ti-alert-circle mr-1"></i> {error}
          </div>
        )}

        {/* Forms panel */}
        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
              <div className="relative">
                <i className="ti ti-user absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="enter your username..."
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/70 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <i className="ti ti-lock absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                <input
                  type={showLoginPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/70 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors text-base"
                >
                  <i className={showLoginPass ? "ti ti-eye-off" : "ti ti-eye"}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In Account'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 text-left max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username *</label>
              <input
                type="text"
                placeholder="johndoe"
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
              <input
                type="email"
                placeholder="john@college.edu"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password *</label>
              <div className="relative">
                <input
                  type={showRegPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/70 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPass(!showRegPass)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors text-base"
                >
                  <i className={showRegPass ? "ti ti-eye-off" : "ti ti-eye"}></i>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Role *</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="Student">Student (Access Materials & AI Q&A)</option>
                <option value="Teacher">Teacher (Upload PDFs & Access Analytics)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Picture (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setRegPic(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biography (Optional)</label>
              <textarea
                placeholder="write a brief bio..."
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 text-center flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create New Account'
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
