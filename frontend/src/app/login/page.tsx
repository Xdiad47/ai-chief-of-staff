'use client';

import React, { useState } from 'react';

import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Building2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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
      // Wait for the auth context listener to trigger the route redirect based on role
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-brand-900 p-4">
      <Card className="w-full max-w-md" padding="lg">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-brand-100 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chief of Staff</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
          />
          
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-brand-600 hover:text-brand-700 font-semibold">
            Start Free Trial →
          </a>
        </p>
      </Card>
    </div>
  );
}
