'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  Building2, Eye, EyeOff, BrainCircuit, Users, CalendarCheck,
  CheckSquare, FileText, ShieldCheck, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'AI-Powered Assistant',
    desc: 'Ask anything about HR policies, leaves, or tasks — get instant answers.',
  },
  {
    icon: Users,
    title: 'Team Management',
    desc: 'Manage employees, departments, and performance from one place.',
  },
  {
    icon: CalendarCheck,
    title: 'Leave Tracking',
    desc: 'Apply, approve, and monitor leave requests in real time.',
  },
  {
    icon: CheckSquare,
    title: 'Task & Projects',
    desc: 'Assign tasks, track progress, and reward high performers.',
  },
  {
    icon: FileText,
    title: 'Policy Hub',
    desc: 'Upload company documents and let AI answer employee questions.',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || password.length < 6) {
      toast.error('Please enter valid email and password (min 6 chars)');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: unknown) {
      console.error(error);
      const code = (error as { code?: string }).code;
      if (code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
      } else if (code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error('Failed to log in.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left: Product showcase ── */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-gray-900 via-brand-950 to-brand-900 text-white flex-col justify-between p-12 relative overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-80px] left-[-80px] w-96 h-96 bg-brand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 bg-brand-600 rounded-full blur-3xl" />
        </div>

        {/* Logo + name */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide">AI Chief of Staff</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Your Intelligent<br />
            <span className="text-brand-300">HR Command Center</span>
          </h1>
          <p className="text-gray-300 text-base leading-relaxed max-w-sm">
            One platform to manage your people, policies, and productivity — powered by AI that works as hard as you do.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-5 my-10">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-brand-300" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>Secured by Firebase Auth · Data stored on Google Cloud</span>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 min-h-screen md:min-h-0">

        {/* Mobile-only header */}
        <div className="flex md:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">AI Chief of Staff</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1 text-sm">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-brand-50 border border-brand-100 rounded-xl">
            <p className="text-xs text-brand-700 font-medium mb-1">New to AI Chief of Staff?</p>
            <p className="text-xs text-gray-500 mb-3">
              Register your company and start your free 5-day trial — no credit card required.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Start Free Trial <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            By signing in you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
