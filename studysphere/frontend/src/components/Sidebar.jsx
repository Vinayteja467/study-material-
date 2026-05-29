import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const Sidebar = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation Config based on User Role
  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: 'ti ti-layout-dashboard',
      roles: ['Teacher', 'Student', 'admin'],
    },
    {
      to: '/materials',
      label: 'Materials',
      icon: 'ti ti-files',
      roles: ['Teacher', 'Student'],
      badge: 'materials_count',
    },
    {
      to: '/workspace',
      label: 'AI Chat Space',
      icon: 'ti ti-brain',
      roles: ['Teacher', 'Student'],
    },
    {
      to: '/students',
      label: 'Students',
      icon: 'ti ti-users',
      roles: ['Teacher'],
      badge: 'students_count',
    },
    {
      to: '/attendance',
      label: 'Attendance',
      icon: 'ti ti-calendar-check',
      roles: ['Teacher', 'Student'],
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: 'ti ti-chart-bar',
      roles: ['Teacher', 'Student'],
    },
    {
      to: '/tests',
      label: 'Mock Tests',
      icon: 'ti ti-clipboard-list',
      roles: ['Teacher', 'Student'],
    },
    {
      to: '/admin',
      label: 'Admin Control',
      icon: 'ti ti-shield-lock',
      roles: ['admin'],
    },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="w-[80px] lg:w-[260px] min-h-screen bg-[#1F2937] text-slate-100 flex flex-col justify-between p-4 transition-all duration-300 z-30 shrink-0 border-r border-slate-800">
      
      {/* Brand logo */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-md shrink-0">
            S
          </div>
          <span className="hidden lg:block text-xl font-bold tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent uppercase">
            StudySphere
          </span>
        </div>

        {/* User Role Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/30 w-fit text-xs font-semibold text-slate-300">
          <span className={`w-2.5 h-2.5 rounded-full ${role === 'Teacher' ? 'bg-emerald-400' : role === 'admin' ? 'bg-amber-400' : 'bg-cyan-400'}`}></span>
          {role}
        </div>

        {/* Grouped links */}
        <nav className="flex flex-col gap-2 mt-4">
          {navItems
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-center lg:justify-between px-3 py-3 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800/50 hover:translate-x-1.5 transition-all duration-200 ${
                    isActive ? 'bg-white/10 text-white font-semibold' : ''
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <i className={`${item.icon} text-lg shrink-0`}></i>
                  <span className="hidden lg:block text-sm">{item.label}</span>
                </div>
                
                {/* Optional Mock badge counts */}
                {item.badge && (
                  <span className="hidden lg:inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white leading-none">
                    {item.badge === 'materials_count' ? '12' : '32'}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>
      </div>

      {/* User profile plate & logout */}
      <div className="flex flex-col gap-4 border-t border-slate-700/50 pt-4">
        <div className="flex items-center justify-center lg:justify-start gap-3">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200 shrink-0 border border-slate-600">
              {getInitials(user?.full_name || user?.username)}
            </div>
          )}
          
          <div className="hidden lg:flex flex-col text-left truncate">
            <span className="text-sm font-semibold truncate text-slate-100">{user?.full_name || user?.username}</span>
            <span className="text-[10px] text-slate-400 capitalize">{user?.role} Portal</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full"
        >
          <i className="ti ti-logout text-lg shrink-0"></i>
          <span className="hidden lg:block text-xs font-semibold">Sign Out</span>
        </button>
      </div>
      
    </aside>
  );
};
