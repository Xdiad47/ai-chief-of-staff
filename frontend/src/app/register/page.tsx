'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { sendOtp, verifyOtp, registerCompany } from '../../lib/register-api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  PartyPopper,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanyDetails {
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  logo: File | null;
  logoPreview: string;
}

interface AdminAccount {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ── Step Progress Bar ─────────────────────────────────────────────────────────

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
            i + 1 < current
              ? 'bg-brand-600 text-white'
              : i + 1 === current
              ? 'bg-brand-600 text-white ring-4 ring-brand-200'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {i + 1 < current ? <Check size={14} /> : i + 1}
        </div>
        {i < total - 1 && (
          <div
            className={`h-0.5 w-10 transition-all duration-300 ${
              i + 1 < current ? 'bg-brand-600' : 'bg-gray-200'
            }`}
          />
        )}
      </React.Fragment>
    ))}
    <p className="ml-3 text-xs text-gray-400 font-medium">
      Step {current} of {total}
    </p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState('');

  // Step 1 state
  const [company, setCompany] = useState<CompanyDetails>({
    companyName: '',
    industry: '',
    companySize: '',
    website: '',
    logo: null,
    logoPreview: '',
  });

  // Step 2 state
  const [admin, setAdmin] = useState<AdminAccount>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 3 OTP state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cooldown timer ──────────────────────────────────────────────────────────

  const startCooldown = useCallback(() => {
    setCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Step 1: Company Details ─────────────────────────────────────────────────

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () =>
      setCompany((c) => ({ ...c, logo: file, logoPreview: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleStep1Next = () => {
    if (!company.companyName.trim()) return toast.error('Company name is required');
    if (!company.industry) return toast.error('Please select an industry');
    if (!company.companySize) return toast.error('Please select a company size');
    if (!company.logo) return toast.error('Please upload a company logo');
    setStep(2);
  };

  // ── Step 2: Admin Account ───────────────────────────────────────────────────

  const handleStep2Next = async () => {
    if (!admin.fullName.trim()) return toast.error('Full name is required');
    if (!admin.email.trim() || !/\S+@\S+\.\S+/.test(admin.email))
      return toast.error('Please enter a valid email address');
    if (admin.password.length < 8)
      return toast.error('Password must be at least 8 characters');
    if (admin.password !== admin.confirmPassword)
      return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await sendOtp(admin.email);
      startCooldown();
      setStep(3);
      toast.success('Verification code sent to your email!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: OTP ─────────────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await sendOtp(admin.email);
      startCooldown();
      toast.success('A new code has been sent');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) return toast.error('Please enter the 6-digit code');

    setLoading(true);
    try {
      // 1. Verify OTP
      await verifyOtp(admin.email, otpString);

      // 2. Build multipart form data
      const formData = new FormData();
      formData.append('company_name', company.companyName);
      formData.append('industry', company.industry);
      formData.append('company_size', company.companySize);
      formData.append('website', company.website);
      formData.append('founder_name', admin.fullName);
      formData.append('email', admin.email);
      formData.append('password', admin.password);
      formData.append('logo', company.logo!);

      // 3. Register company
      const result = await registerCompany(formData);
      setTrialEndsAt(result.trial_ends_at);

      // 4. Sign into Firebase so auth-context gets the token
      const userCredential = await signInWithEmailAndPassword(auth, admin.email, admin.password);
      // Force token refresh so custom claims (role, company_id) are picked up immediately
      await userCredential.user.getIdToken(true);

      // 5. Show success screen
      setStep(4);

      // 6. Auto-redirect after 3 s (auth-context handles routing by role)
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatTrialDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-brand-900 p-4 py-10">
      <div className="w-full max-w-lg">
        {/* ── SUCCESS STATE ─────────────────────────────────────────────────── */}
        {step === 4 ? (
          <Card padding="lg" className="text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <PartyPopper className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎉 Welcome to AI Chief of Staff!
              </h1>
              <p className="text-gray-500 text-sm max-w-sm">
                Your company has been set up successfully. Your 5-day free trial has started.
              </p>
              {trialEndsAt && (
                <div className="bg-brand-50 border border-brand-200 rounded-xl px-6 py-3 text-brand-700 text-sm font-semibold">
                  Trial ends: {formatTrialDate(trialEndsAt)}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Redirecting you to the dashboard in 3 seconds…
              </p>
              <Button
                className="w-full mt-2"
                size="lg"
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* ── BRAND HEADER ──────────────────────────────────────────────── */}
            <div className="flex flex-col items-center mb-6">
              <div className="p-3 bg-white/10 rounded-full mb-3">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Chief of Staff</h1>
              <p className="text-gray-300 text-sm mt-1">Start your free 5-day trial</p>
            </div>

            <Card padding="lg">
              <StepIndicator current={step} total={3} />

              {/* ── STEP 1 ──────────────────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Company Details</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Tell us about your organisation</p>
                  </div>

                  <Input
                    label="Company Name *"
                    placeholder="Acme Corp"
                    value={company.companyName}
                    onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                      <select
                        className="block w-full rounded-md border border-gray-300 focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2 bg-white"
                        value={company.industry}
                        onChange={(e) => setCompany((c) => ({ ...c, industry: e.target.value }))}
                      >
                        <option value="">Select…</option>
                        {['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Other'].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Size *</label>
                      <select
                        className="block w-full rounded-md border border-gray-300 focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2 bg-white"
                        value={company.companySize}
                        onChange={(e) => setCompany((c) => ({ ...c, companySize: e.target.value }))}
                      >
                        <option value="">Select…</option>
                        {['1–10', '11–50', '51–200', '200+'].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo *</label>
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors relative overflow-hidden">
                      {company.logoPreview ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={company.logoPreview}
                            alt="Logo preview"
                            className="h-full w-full object-contain p-4"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white text-xs font-medium">Click to change</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Upload size={28} />
                          <p className="text-sm font-medium">Click to upload logo</p>
                          <p className="text-xs">PNG, JPG, WebP up to 5MB</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                  </div>

                  <Input
                    label="Company Website (optional)"
                    placeholder="https://acmecorp.com"
                    type="url"
                    value={company.website}
                    onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))}
                  />

                  <Button className="w-full" size="lg" onClick={handleStep1Next}>
                    Continue <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              )}

              {/* ── STEP 2 ──────────────────────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Admin Account</h2>
                    <p className="text-sm text-gray-500 mt-0.5">This will be your login and admin account</p>
                  </div>

                  <Input
                    label="Full Name *"
                    placeholder="Jane Smith"
                    value={admin.fullName}
                    onChange={(e) => setAdmin((a) => ({ ...a, fullName: e.target.value }))}
                  />

                  <Input
                    label="Work Email *"
                    type="email"
                    placeholder="jane@acmecorp.com"
                    value={admin.email}
                    onChange={(e) => setAdmin((a) => ({ ...a, email: e.target.value }))}
                  />

                  <div className="relative">
                    <Input
                      label="Password *"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={admin.password}
                      onChange={(e) => setAdmin((a) => ({ ...a, password: e.target.value }))}
                      hint="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      label="Confirm Password *"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={admin.confirmPassword}
                      onChange={(e) => setAdmin((a) => ({ ...a, confirmPassword: e.target.value }))}
                      error={
                        admin.confirmPassword && admin.password !== admin.confirmPassword
                          ? 'Passwords do not match'
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      size="lg"
                      onClick={() => setStep(1)}
                    >
                      <ChevronLeft size={16} className="mr-1" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      loading={loading}
                      onClick={handleStep2Next}
                    >
                      Send Code <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ──────────────────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900">Verify Your Email</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      We sent a 6-digit code to{' '}
                      <span className="font-semibold text-brand-600">{admin.email}</span>
                    </p>
                  </div>

                  {/* OTP Input Boxes */}
                  <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                      />
                    ))}
                  </div>

                  {/* Resend */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || loading}
                      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      <RefreshCw size={14} />
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      size="lg"
                      onClick={() => setStep(2)}
                    >
                      <ChevronLeft size={16} className="mr-1" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      loading={loading}
                      onClick={handleVerifyAndRegister}
                    >
                      <Check size={16} className="mr-1" /> Verify & Create
                    </Button>
                  </div>
                </div>
              )}

              {/* ── SIGN IN LINK ─────────────────────────────────────────────── */}
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-brand-600 hover:text-brand-700 font-semibold">
                  Sign In
                </Link>
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
