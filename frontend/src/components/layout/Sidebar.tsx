'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { LayoutDashboard, Users, Upload, MessageSquare, LogOut, Building2 } from 'lucide-react';

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const adminLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Upload Policy', href: '/upload', icon: Upload },
  ];

  const employeeLinks = [
    { name: 'AI Assistant', href: '/chat', icon: MessageSquare },
  ];

  const links = user?.role === 'admin' ? adminLinks : employeeLinks;

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
        <div className="p-2 bg-brand-600 rounded-lg">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider">AI CHIEF OF STAFF</h1>
          <span className="text-xs text-brand-300 uppercase">{user?.role}</span>
        </div>
      </div>
      
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

      <div className="p-4 border-t border-gray-800">
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
