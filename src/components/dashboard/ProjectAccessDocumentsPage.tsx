import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Eye, 
  FileText, 
  File, 
  Image, 
  FileSpreadsheet,
  FileImage,
  Building,
  Calendar,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { toast } from 'sonner';

interface Document {
  doc_id: string;
  doc_name: string;
  doc_url: string;
  doc_size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  client_name?: string;
}

const ProjectAccessDocumentsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState<string>('');
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const session = localStorage.getItem('projectAccessSession');
    if (!session) {
      navigate('/project-access/login');
      return;
    }

    const parsedSession = JSON.parse(session);
    if (parsedSession.projectId !== projectId) {
      toast.error('Invalid project access');
      navigate('/project-access/login');
      return;
    }

    setSessionData(parsedSession);
    fetchData();
  }, [projectId, navigate]);

  const fetchData = async () => {
    try {
      console.log('🔍 ProjectAccessDocumentsPage - Fetching data for projectId:', projectId);
      
      // First try to fetch from projects table
      let projectData = null;
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectsData && !projectsError) {
        console.log('🔍 ProjectAccessDocumentsPage - Found in projects table:', projectsData);
        projectData = projectsData;
      } else {
        console.log('🔍 ProjectAccessDocumentsPage - Not found in projects table, checking rental deals...');
        
        // Check rental deals
        const { data: rentalDeal, error: rentalError } = await supabase
          .from('rental_deals')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (rentalDeal && !rentalError) {
          console.log('🔍 ProjectAccessDocumentsPage - Found rental deal:', rentalDeal);
          projectData = {
            id: rentalDeal.project_id,
            name: rentalDeal.project_name,
            description: `Rental Deal: ${rentalDeal.deal_type}`,
            status: 'active',
            client_name: rentalDeal.client_name,
            start_date: rentalDeal.start_date,
            expected_end_date: rentalDeal.end_date
          };
        } else {
          console.log('🔍 ProjectAccessDocumentsPage - Not found in rental deals, checking builder deals...');
          
          // Check builder deals
          const { data: builderDeal, error: builderError } = await supabase
            .from('builder_deals')
            .select('*')
            .eq('project_id', projectId)
            .single();

          if (builderDeal && !builderError) {
            console.log('🔍 ProjectAccessDocumentsPage - Found builder deal:', builderDeal);
            projectData = {
              id: builderDeal.project_id,
              name: builderDeal.project_name,
              description: `Builder Deal: ${builderDeal.deal_type}`,
              status: 'active',
              client_name: builderDeal.client_name,
              start_date: builderDeal.start_date,
              expected_end_date: builderDeal.end_date
            };
          }
        }
      }

      if (!projectData) {
        throw new Error('Project not found');
      }

      setProject(projectData);

      // Fetch project documents from the projects.documents JSONB field
      const { data: projectWithDocs, error: docsError } = await supabase
        .from('projects')
        .select('documents')
        .eq('id', projectId)
        .single();

      if (docsError) {
        console.log('🔍 ProjectAccessDocumentsPage - Documents error:', docsError);
        setDocuments([]);
      } else {
        console.log('🔍 ProjectAccessDocumentsPage - Found documents in projects.documents:', projectWithDocs?.documents);
        // Convert the JSONB documents to our Document interface format
        const docs = projectWithDocs?.documents || [];
        const formattedDocs = docs.map((doc: any, index: number) => ({
          doc_id: doc.doc_id || `doc_${index}`,
          doc_name: doc.doc_name || doc.name || 'Unknown Document',
          doc_url: doc.doc_url || doc.url || '',
          doc_size: doc.doc_size || doc.size || 0,
          uploaded_at: doc.uploaded_at || doc.created_at || new Date().toISOString(),
          uploaded_by: doc.uploaded_by || doc.uploadedBy || null
        }));
        setDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !project) return;

    setUploading(true);
    try {
      console.log('🔍 ProjectAccessDocumentsPage - Starting file upload for project:', project.id);
      
      // Upload file to Supabase Storage (same as existing system)
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `projects/${project.id}/${fileName}`;

      console.log('🔍 ProjectAccessDocumentsPage - Uploading to path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, uploadFile);

      if (uploadError) {
        console.error('🔍 ProjectAccessDocumentsPage - Upload error:', uploadError);
        throw uploadError;
      }

      console.log('🔍 ProjectAccessDocumentsPage - Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      console.log('🔍 ProjectAccessDocumentsPage - Public URL:', urlData.publicUrl);

      // Create new document object (same format as existing system)
      const newDocument = {
        doc_id: uploadData.path,
        doc_name: documentName || uploadFile.name,
        doc_url: urlData.publicUrl,
        doc_size: uploadFile.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: sessionData?.entityId
      };

      console.log('🔍 ProjectAccessDocumentsPage - New document:', newDocument);

      // Update project documents in the projects.documents JSONB field
      const updatedDocuments = [...documents, newDocument];

      console.log('🔍 ProjectAccessDocumentsPage - Updated documents array:', updatedDocuments);

      const { error: updateError } = await supabase
        .from('projects')
        .update({ documents: updatedDocuments })
        .eq('id', project.id);

      if (updateError) {
        console.error('🔍 ProjectAccessDocumentsPage - Update error:', updateError);
        throw updateError;
      }

      console.log('🔍 ProjectAccessDocumentsPage - Project documents updated successfully');

      // Refresh documents list
      await fetchData();
      
      setShowUploadModal(false);
      setUploadFile(null);
      setDocumentName('');
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(document.doc_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.doc_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download document');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return <Image className="w-5 h-5 text-blue-600" />;
      case 'xlsx':
      case 'xls': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      default: return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(`/project-access/dashboard/${projectId}`)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/project-access/dashboard/${projectId}`)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-600">Project Documents</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </Button>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Access as:</span> {sessionData?.entityName} ({sessionData?.accessType})
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Documents List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Project Documents</h3>
            <div className="text-sm text-gray-600">
              {documents.length} document{documents.length !== 1 ? 's' : ''} total
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600 mb-4">There are no documents for this project yet.</p>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload First Document
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <div key={document.doc_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getFileIcon(document.doc_name)}
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{document.doc_name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>{formatFileSize(document.doc_size)}</span>
                          <span>•</span>
                          <span>Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(document.doc_url, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        className="flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Document">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Name
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use the file name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
          </div>
          
          {uploadFile && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>File:</strong> {uploadFile.name} ({formatFileSize(uploadFile.size)})
              </p>
              {documentName && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Document Name:</strong> {documentName}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setDocumentName('');
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFileUpload}
              disabled={!uploadFile || uploading}
              className="flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectAccessDocumentsPage;
