'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { LayoutDashboard, Users, Upload, MessageSquare, LogOut, Building2, Calendar, CheckSquare, Star, FolderOpen, Home, ListChecks } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { Employee } from '../../types';
import { getAuth } from 'firebase/auth';

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [openTaskCount, setOpenTaskCount] = useState<number>(0);

  useEffect(() => {
    if (user?.role === 'employee' && user?.companyId && user?.employeeId) {
      employeeService.getProfile(user.companyId, user.employeeId)
        .then(data => setProfile(data))
        .catch(err => console.error("Failed to fetch profile", err));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.companyId || !user?.employeeId) return;
    const fetchTaskCount = async () => {
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(
          `/api/employee/${user.companyId}/${user.employeeId}/tasks`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setOpenTaskCount(data.total_count ?? 0);
        }
      } catch (e) {
        console.error("Failed to fetch task count", e);
      }
    };
    fetchTaskCount();
  }, [user?.companyId, user?.employeeId]);

  const adminLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Team Tasks', href: '/team-tasks', icon: ListChecks },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Upload Policy', href: '/upload', icon: Upload },
  ];

  const employeeLinks = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'AI Assistant', href: '/chat', icon: MessageSquare },
    { name: 'My Leaves', href: '/leaves', icon: Calendar },
    { name: 'My Tasks', href: '/tasks', icon: CheckSquare },
  ];

  const isAdmin = user?.role === 'admin';
  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto scrollbar-none">
      <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
        <div className="p-2 bg-brand-600 rounded-lg">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider">AI CHIEF OF STAFF</h1>
          <span className="text-xs text-brand-300 uppercase">{user?.role}</span>
        </div>
      </div>
      
      {!isAdmin && profile && (
        <div className="px-4 pt-6 pb-2 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold shadow-md">
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{profile.name}</p>
              <p className="text-xs text-gray-400">{profile.department || 'Employee'}</p>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-3 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span>Points</span>
              </div>
              <span className="text-sm font-bold text-white">{profile.performance_points || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Leaves</span>
              </div>
              {/* @ts-ignore */}
              <span className="text-sm font-bold text-white">{profile.leave_balance?.annual || 12}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <CheckSquare className="w-3.5 h-3.5 text-green-400" />
                <span>Tasks</span>
              </div>
              <span className="text-sm font-bold text-white">{openTaskCount}</span>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 mt-auto">
        <div className="mb-4 px-4 text-sm">
          <p className="text-gray-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center space-x-3 px-4 py-2 w-full rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Log Out</span>
        </button>
      </div>
    </div>
  );
};
