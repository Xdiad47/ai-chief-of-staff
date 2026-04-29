'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../lib/auth-context';
import toast from 'react-hot-toast';
import { FileUp, File, Info, CheckCircle2 } from 'lucide-react';

export default function UploadPolicyPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successFile, setSuccessFile] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setSuccessFile(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false
  });

  const handleUpload = async () => {
    if (!file || !user?.companyId) return;

    try {
      setUploading(true);
      await adminService.uploadPolicy(user.companyId, file);
      setSuccessFile(file.name);
      setFile(null);
      toast.success('Policy uploaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload policy');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout title="Upload HR Policy" subtitle="Upload company policies for the AI Assistant to read.">
      <div className="max-w-3xl">
        {successFile && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Successfully uploaded {successFile}</h4>
              <p className="text-sm text-green-700 mt-1">Employees can now ask about this policy in the AI Assistant.</p>
            </div>
          </div>
        )}

        <Card className="mb-8">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
            } ${file ? 'bg-gray-50' : ''}`}
          >
            <input {...getInputProps()} />
            
            {!file ? (
              <div className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                  <FileUp className="w-8 h-8 text-brand-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Click to upload or drag and drop</h3>
                <p className="text-sm text-gray-500">PDF documents only (max 20MB)</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <File className="w-12 h-12 text-brand-500 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">{file.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <div className="flex space-x-3">
                  <Button 
                    variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                    loading={uploading}
                  >
                    Upload Policy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card padding="md" className="bg-blue-50 border-blue-100">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">How it works</h4>
              <p className="text-sm text-blue-800 mt-1">
                When you upload a policy PDF, it is securely processed and indexed. The AI Assistant will instantly learn the new rules and be able to answer employee questions about leave, remote work, expenses, and more based on this document.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
