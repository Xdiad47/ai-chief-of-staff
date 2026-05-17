'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { adminService, Policy } from '../../services/adminService';
import { useAuth } from '../../lib/auth-context';
import toast from 'react-hot-toast';
import { FileUp, File, Info, CheckCircle2, FileText, ExternalLink, BookOpen } from 'lucide-react';

export default function UploadPolicyPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successFile, setSuccessFile] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  const fetchPolicies = async () => {
    if (!user?.companyId) return;
    try {
      setLoadingPolicies(true);
      const data = await adminService.getPolicies(user.companyId);
      setPolicies(data || []);
    } catch {
      // non-blocking — silently ignore if fetch fails
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setSuccessFile(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !user?.companyId) return;
    try {
      setUploading(true);
      await adminService.uploadPolicy(user.companyId, file);
      setSuccessFile(file.name);
      setFile(null);
      toast.success('Policy uploaded successfully!');
      fetchPolicies();
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload policy');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AdminLayout title="Policy Management" subtitle="Upload and manage company policies for the AI Assistant.">
      <div className="max-w-3xl space-y-8">

        {/* ── Upload Section ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Upload New Policy</h2>

          {successFile && (
            <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Successfully uploaded {successFile}</h4>
                <p className="text-sm text-green-700 mt-0.5">Employees can now ask about this policy in the AI Assistant.</p>
              </div>
            </div>
          )}

          <Card className="mb-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
              } ${file ? 'bg-gray-50' : ''}`}
            >
              <input {...getInputProps()} />
              {!file ? (
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <FileUp className="w-8 h-8 text-brand-500" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">Click to upload or drag and drop</h3>
                  <p className="text-sm text-gray-500">PDF documents only (max 20MB)</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <File className="w-12 h-12 text-brand-500 mb-3" />
                  <h3 className="text-base font-medium text-gray-900">{file.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <div className="flex space-x-3">
                    <Button variant="ghost" onClick={e => { e.stopPropagation(); setFile(null); }} disabled={uploading}>
                      Remove
                    </Button>
                    <Button onClick={e => { e.stopPropagation(); handleUpload(); }} loading={uploading}>
                      Upload Policy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card padding="md" className="bg-blue-50 border-blue-100">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">How it works</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Uploaded policy PDFs are securely processed and indexed. The AI Assistant will instantly learn the new rules and answer employee questions about leave, remote work, expenses, and more.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Policies Library ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-800">Policies Library</h2>
            {!loadingPolicies && (
              <span className="ml-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {policies.length}
              </span>
            )}
          </div>

          <Card padding="none" className="overflow-hidden">
            {loadingPolicies ? (
              <div className="py-10 flex justify-center">
                <span className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : policies.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">No policies uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">Use the upload area above to add your first policy document.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {policies.map(policy => (
                  <li key={policy.policy_id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{policy.filename}</p>
                        <p className="text-xs text-gray-400">Uploaded {formatDate(policy.uploaded_at)}</p>
                      </div>
                    </div>
                    <a
                      href={policy.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Preview
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

      </div>
    </AdminLayout>
  );
}
