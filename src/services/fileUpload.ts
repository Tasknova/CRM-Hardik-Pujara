import { supabase } from '../lib/supabase';
import { TaskAttachment } from '../types';

export const fileUploadService = {
  /**
   * Upload a file to Supabase Storage and return the public URL
   */
  async uploadFile(file: File, userId: string): Promise<TaskAttachment> {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Create attachment object
      const attachment: TaskAttachment = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: publicUrl,
        type: 'file',
        file_type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };

      return attachment;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Create a URL attachment (no file upload needed)
   */
  createUrlAttachment(url: string): TaskAttachment {
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: url,
      url: url,
      type: 'url',
      uploaded_at: new Date().toISOString()
    };
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (!fileName) {
        throw new Error('Invalid file URL');
      }

      const { error } = await supabase.storage
        .from('task-attachments')
        .remove([fileName]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 50MB' };
    }

    const isAllowedType = allowedTypes.some(type => 
      file.type.startsWith(type) || file.type === type
    );

    if (!isAllowedType) {
      return { isValid: false, error: 'File type not allowed. Please upload images, PDFs, documents, or spreadsheets.' };
    }

    return { isValid: true };
  }
};
