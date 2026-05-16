'use client';

import React, { useState } from 'react';
import { Building2, Star, Send, CheckCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/auth-context';

export default function ExpiredPage() {
  const { user, logout } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [liked, setLiked] = useState('');
  const [improve, setImprove] = useState('');
  const [wantToContinue, setWantToContinue] = useState(true);
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [companyName, setCompanyName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error('Please give a star rating'); return; }
    if (!contactEmail) { toast.error('Please enter your email'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName || 'Unknown',
          contact_email: contactEmail,
          rating,
          liked: liked || '—',
          improve: improve || '—',
          want_to_continue: wantToContinue,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      toast.error('Could not send feedback. Please email us directly.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
          <p className="text-gray-500 mb-2">Your feedback has been sent.</p>
          {wantToContinue && (
            <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-xl p-4 mt-4">
              We'll reach out to you at <strong>{contactEmail}</strong> to discuss continuing your access.
            </p>
          )}
          <button
            onClick={logout}
            className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your trial has ended</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">
            Your 15-day free trial of AI Chief of Staff has expired. We'd love to hear what you think — and if you'd like to keep going, let us know.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Company + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Company name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Your email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Star rating */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">How would you rate the product? <span className="text-red-500">*</span></label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        n <= (hovered || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-gray-500 self-center">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                  </span>
                )}
              </div>
            </div>

            {/* What did you like */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">What did you like most?</label>
              <textarea
                value={liked}
                onChange={e => setLiked(e.target.value)}
                rows={2}
                placeholder="The AI assistant, leave tracking, task management..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              />
            </div>

            {/* What to improve */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">What could be better?</label>
              <textarea
                value={improve}
                onChange={e => setImprove(e.target.value)}
                rows={2}
                placeholder="Anything you'd change or add..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Want to continue */}
            <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-100 rounded-xl">
              <input
                type="checkbox"
                id="want-continue"
                checked={wantToContinue}
                onChange={e => setWantToContinue(e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
              <label htmlFor="want-continue" className="text-sm text-brand-800 font-medium cursor-pointer">
                I'm interested in continuing — please reach out to discuss
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Send Feedback</>
              )}
            </button>
          </form>

          {/* Direct contact fallback */}
          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Or email us directly at <a href="mailto:rohannth94@gmail.com" className="text-brand-600 hover:underline">rohannth94@gmail.com</a></span>
          </div>
        </div>

        <button onClick={logout} className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
