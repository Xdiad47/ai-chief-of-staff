'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { Sidebar } from './Sidebar';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const AdminLayout = ({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading admin area..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        {(title || subtitle) && (
          <header className="bg-white border-b border-gray-200 px-8 py-6">
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </header>
        )}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
