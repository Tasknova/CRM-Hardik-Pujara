import React, { useState } from 'react';
import { Key, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';
import bcrypt from 'bcryptjs';
import { toast } from 'sonner';

const ProjectAccessLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    projectId: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find the credential
      const { data: credentials, error } = await supabase
        .from('project_access_credentials')
        .select('*')
        .eq('project_id', formData.projectId)
        .eq('is_active', true);

      if (error) throw error;

      if (!credentials || credentials.length === 0) {
        toast.error('Invalid Project ID or no active credentials found');
        return;
      }

      // Check password against all active credentials for this project
      let validCredential = null;
      for (const credential of credentials) {
        const isValid = await bcrypt.compare(formData.password, credential.password_hash);
        if (isValid) {
          validCredential = credential;
          break;
        }
      }

      if (!validCredential) {
        toast.error('Invalid password');
        return;
      }

      // Update last accessed time
      await supabase
        .from('project_access_credentials')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', validCredential.id);

      // Store session data
      const sessionData = {
        projectId: formData.projectId,
        accessType: validCredential.access_type,
        entityName: validCredential.entity_name,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('projectAccessSession', JSON.stringify(sessionData));

      toast.success('Login successful!');
      navigate(`/project-access/dashboard/${formData.projectId}`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Propazone Branding */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-full shadow-xl border-4 border-blue-100">
            <div className="flex items-center justify-center">
              <img src="/logoFinal.png" alt="Propazone Logo" className="h-14 w-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Access</h2>
            <p className="text-gray-600">Enter your project credentials to access the project</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project ID
              </label>
              <input
                type="text"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter Project ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-3 flex items-center justify-center space-x-2"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Access Project</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Need Access?</h3>
            <p className="text-sm text-blue-700">
              Contact your project administrator to get project access credentials.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProjectAccessLogin;
