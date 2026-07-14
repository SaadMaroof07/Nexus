import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, PenTool } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface DocumentItem {
  id: number;
  title: string;
  file: string;
  status: 'draft' | 'final' | 'signed';
  version: number;
  uploaded_by_name: string;
  signed_by_name: string | null;
  signature: string | null;
  uploaded_at: string;
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [signingDocId, setSigningDocId] = useState<number | null>(null);

  const fetchDocuments = () => {
    setLoading(true);
    api.get('/documents/')
      .then((res) => setDocuments(res.data.results || res.data))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    setUploading(true);
    try {
      await api.post('/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded!');
      fetchDocuments();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}/`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSignClick = (id: number) => {
    setSigningDocId(id);
    signatureInputRef.current?.click();
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !signingDocId) return;

    const formData = new FormData();
    formData.append('signature', file);

    try {
      await api.patch(`/documents/${signingDocId}/sign/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document signed!');
      fetchDocuments();
    } catch {
      toast.error('Signing failed');
    } finally {
      setSigningDocId(null);
      if (signatureInputRef.current) signatureInputRef.current.value = '';
    }
  };

  const statusColor = (status: string) => {
    if (status === 'signed') return 'primary';
    if (status === 'final') return 'secondary';
    return 'gray'; // draft
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading documents...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Upload, preview, and sign your documents</p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            leftIcon={<Upload size={18} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>

        {/* Hidden input used only for signature image upload */}
        <input
          type="file"
          accept="image/*"
          ref={signatureInputRef}
          onChange={handleSignatureUpload}
          className="hidden"
        />
      </div>

      <div className="space-y-4">
        {documents.length === 0 && (
          <p className="text-center text-gray-500 py-8">No documents uploaded yet.</p>
        )}

        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-md">
                  <FileText size={20} className="text-primary-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{doc.title}</h3>
                    <Badge variant={statusColor(doc.status)}>{doc.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    v{doc.version} • Uploaded by {doc.uploaded_by_name} •{' '}
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                  {doc.signed_by_name && (
                    <p className="text-xs text-green-600 mt-1">Signed by {doc.signed_by_name}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <a href={doc.file} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" leftIcon={<Download size={16} />}>
                    View
                  </Button>
                </a>
                {doc.status !== 'signed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<PenTool size={16} />}
                    onClick={() => handleSignClick(doc.id)}
                  >
                    Sign
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Trash2 size={16} />}
                  onClick={() => handleDelete(doc.id)}
                >
                  Delete
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};