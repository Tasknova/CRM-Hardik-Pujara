import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Building, FileText, Calendar, Lock, Eye, EyeOff } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Broker } from '../../types';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface BrokerProfileProps {
  broker: Broker & { role: 'broker' };
}

const BrokerProfile: React.FC<BrokerProfileProps> = ({ broker }) => {
  const { user, setUser } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Verify current password
    const hashedCurrentPassword = btoa(passwordForm.currentPassword);
    if (!broker.password_hash || broker.password_hash !== hashedCurrentPassword) {
      toast.error('Current password is incorrect');
      return;
    }

    setChangingPassword(true);
    try {
      // Hash new password
      const hashedNewPassword = btoa(passwordForm.newPassword);

      // Update password
      const { error } = await supabase
        .from('brokers')
        .update({ password_hash: hashedNewPassword })
        .eq('id', broker.id);

      if (error) throw error;

      // Update user in context if this is the current user
      if (user && user.id === broker.id) {
        setUser({ ...broker, password_hash: hashedNewPassword, role: 'broker' });
      }

      toast.success('Password changed successfully!');
      setShowPasswordChange(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Your broker profile information</p>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-start space-x-6 mb-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{broker.name}</h2>
            {broker.company_name && (
              <p className="text-lg text-gray-600 flex items-center mt-1">
                <Building className="w-4 h-4 mr-2" />
                {broker.company_name}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            
            {broker.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{broker.email}</p>
                </div>
              </div>
            )}

            {broker.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{broker.phone}</p>
                </div>
              </div>
            )}

            {broker.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{broker.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
            
            {broker.license_number && (
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">License Number</p>
                  <p className="font-medium text-gray-900">{broker.license_number}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(broker.created_at), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium text-gray-900">
                  {broker.is_active === false ? 'Inactive' : 'Active'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-purple-600" />
              Change Password
            </h3>
            <p className="text-sm text-gray-600 mt-1">Update your login password</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowPasswordChange(!showPasswordChange);
              if (!showPasswordChange) {
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }
            }}
          >
            {showPasswordChange ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {showPasswordChange && (
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  placeholder="Enter current password"
                  required
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={changingPassword}
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  minLength={6}
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={changingPassword}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={changingPassword}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                disabled={changingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default BrokerProfile;

