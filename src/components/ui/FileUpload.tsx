import React, { useRef, useState } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import Button from './Button';
import { toast } from 'sonner';

interface FileUploadProps {
  files: any[];
  onChange: (files: any[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

const FileUpload: React.FC<FileUploadProps> = ({
  files = [],
  onChange,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  acceptedTypes = ['image/*', 'application/pdf', '.doc,.docx,.txt'],
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];
    
    Array.from(fileList).forEach((file, index) => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is ${maxSize}MB`);
        return;
      }

      // Check if we're exceeding max files
      if (files.length + newFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Create file object
      const fileObj: UploadedFile = {
        id: `${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        url: URL.createObjectURL(file)
      };

      newFiles.push(fileObj);
    });

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    onChange(updatedFiles);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (type === 'application/pdf' || type.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Maximum {maxFiles} files, {maxSize}MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          accept={acceptedTypes.join(',')}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Attached Files:</h4>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
