import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  Folder,
  Plus,
  Calendar,
  User,
  File,
  Image,
  FileSpreadsheet,
  FileImage,
  X,
  Save,
  Share2,
  Mail,
  MessageCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  documents: Document[];
}

interface Document {
  doc_id: string;
  doc_name: string;
  doc_url: string;
  doc_size: number;
}

const DocumentHub: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    doc_name: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, client_name, documents')
        .order('name');

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (projectId: string, files: FileList) => {
    if (!files.length) return;

    try {
      setUploading(true);
      const uploadPromises = Array.from(files).map(async (file) => {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `projects/${projectId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('project-documents')
          .getPublicUrl(filePath);

        return {
          doc_id: uploadData.path,
          doc_name: file.name,
          doc_url: urlData.publicUrl,
          doc_size: file.size
        };
      });

      const newDocuments = await Promise.all(uploadPromises);

      // Update project documents
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedDocuments = [...(project.documents || []), ...newDocuments];

      const { error: updateError } = await supabase
        .from('projects')
        .update({ documents: updatedDocuments })
        .eq('id', projectId);

      if (updateError) throw updateError;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, documents: updatedDocuments }
          : p
      ));

      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, documents: updatedDocuments } : null);
      }

      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !documentForm.file) return;

    try {
      setUploading(true);
      
      // Upload file to storage
      const fileExt = documentForm.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `projects/${selectedProject.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, documentForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      const newDocument = {
        doc_id: uploadData.path,
        doc_name: documentForm.doc_name || documentForm.file.name,
        doc_url: urlData.publicUrl,
        doc_size: documentForm.file.size
      };

      // Update project documents
      const updatedDocuments = [...(selectedProject.documents || []), newDocument];

      const { error: updateError } = await supabase
        .from('projects')
        .update({ documents: updatedDocuments })
        .eq('id', selectedProject.id);

      if (updateError) throw updateError;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === selectedProject.id 
          ? { ...p, documents: updatedDocuments }
          : p
      ));

      setSelectedProject(prev => prev ? { ...prev, documents: updatedDocuments } : null);

      // Reset form
      setDocumentForm({ doc_name: '', file: null });
      setShowDocumentForm(false);

      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (projectId: string, docId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedDocuments = project.documents.filter(doc => doc.doc_id !== docId);

      // Update database
      const { error: updateError } = await supabase
        .from('projects')
        .update({ documents: updatedDocuments })
        .eq('id', projectId);

      if (updateError) throw updateError;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('project-documents')
        .remove([docId]);

      if (deleteError) console.warn('Failed to delete from storage:', deleteError);

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, documents: updatedDocuments }
          : p
      ));

      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, documents: updatedDocuments } : null);
      }

      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="w-5 h-5 text-green-600" />;
    } else if (['pdf'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleShareWhatsApp = (doc: Document) => {
    const message = `Check out this document: ${doc.doc_name}\n\nDownload link: ${doc.doc_url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = async (doc: Document) => {
    try {
      // Check if Web Share API is supported and can share files
      if (navigator.share && navigator.canShare) {
        try {
          // Download the file first
          const response = await fetch(doc.doc_url);
          const blob = await response.blob();
          const file = new File([blob], doc.doc_name, { type: blob.type });
          
          // Check if we can share this file
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Document: ${doc.doc_name}`,
              text: `Please find the attached document: ${doc.doc_name}`,
              files: [file]
            });
            return;
          }
        } catch (shareError) {
          console.log('Web Share API failed, falling back to mailto');
        }
      }
      
      // Fallback: Download file and open email compose
      const response = await fetch(doc.doc_url);
      const blob = await response.blob();
      
      // Create a temporary download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.doc_name;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Open email compose
      const subject = `Document: ${doc.doc_name}`;
      const body = `Hi,\n\nPlease find the attached document: ${doc.doc_name}\n\nNote: The document has been downloaded to your device. Please attach it to this email.\n\nBest regards`;
      const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(emailUrl, '_blank');
      
      toast.success('Document downloaded. Please attach it to your email.');
    } catch (error) {
      console.error('Error sharing document:', error);
      toast.error('Failed to share document. Please try again.');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Hub</h1>
          <p className="text-gray-600 mt-1">Manage project documents and files</p>
        </div>
        {selectedProject && (
          <Button
            onClick={() => setSelectedProject(null)}
            variant="outline"
          >
            Back to Projects
          </Button>
        )}
      </div>

      {!selectedProject ? (
        // Projects List View
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Folder className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No projects found' : 'No projects available'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'No projects match your search criteria.' : 'Create a project to start managing documents.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedProject(project)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Folder className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        {project.client_name && (
                          <p className="text-sm text-gray-600">{project.client_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {project.documents?.length || 0} documents
                      </p>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{project.documents?.length || 0} files</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(project);
                      }}
                    >
                      View Documents
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Documents View for Selected Project
        <div className="space-y-6">
          {/* Project Header */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-200 rounded-lg">
                  <Folder className="w-8 h-8 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">{selectedProject.name}</h2>
                  {selectedProject.client_name && (
                    <p className="text-blue-700">Client: {selectedProject.client_name}</p>
                  )}
                  <p className="text-sm text-blue-600">
                    {selectedProject.documents?.length || 0} documents
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  onClick={() => setShowDocumentForm(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Document</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Documents List */}
          {selectedProject.documents?.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-6">Upload files to get started with document management.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedProject.documents?.map((doc, index) => (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getFileIcon(doc.doc_name)}
                      <div>
                        <p className="font-medium text-gray-900">{doc.doc_name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(doc.doc_size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.doc_url, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.doc_url, '_blank')}
                        className="flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareWhatsApp(doc)}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareEmail(doc)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteDocument(selectedProject.id, doc.doc_id)}
                        className="flex items-center space-x-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Document Form Modal */}
      <Modal
        isOpen={showDocumentForm}
        onClose={() => {
          setShowDocumentForm(false);
          setDocumentForm({ doc_name: '', file: null });
        }}
        title="Add New Document"
      >
        <form onSubmit={handleDocumentFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Name
            </label>
            <input
              type="text"
              value={documentForm.doc_name}
              onChange={(e) => setDocumentForm(prev => ({ ...prev, doc_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter document name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Attachment
            </label>
            <input
              type="file"
              onChange={(e) => setDocumentForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {documentForm.file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {documentForm.file.name} ({(documentForm.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDocumentForm(false);
                setDocumentForm({ doc_name: '', file: null });
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !documentForm.file}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentHub;
