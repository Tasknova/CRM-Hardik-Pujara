import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import { User } from 'lucide-react';
import { authService } from '../../services/auth';
import Modal from '../ui/Modal';

const AdminProfile: React.FC = () => {
  const { user, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    let avatar_url = user.avatar_url;
    if (avatarFile) {
      setAvatarUploading(true);
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      await supabase.storage.from('avatars').remove([fileName]);
      const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
      setAvatarUploading(false);
      if (uploadError) {
        console.error('[DEBUG] AdminProfile: Avatar upload error', uploadError);
        alert('Failed to upload avatar: ' + uploadError.message);
        setProfileLoading(false);
        return;
      }
      avatar_url = uploadData?.path
        ? supabase.storage.from('avatars').getPublicUrl(uploadData.path).publicUrl
        : user.avatar_url;
      if (!avatar_url && uploadData?.path) {
        avatar_url = `https://mmadclhbsuvkcbibxcsp.supabase.co/storage/v1/object/public/avatars/${uploadData.path}`;
      }
      if (!avatar_url) {
        console.error('[DEBUG] AdminProfile: Failed to get public URL for avatar', uploadData);
        alert('Failed to get public URL for avatar.');
        setProfileLoading(false);
        return;
      }
    }
    const updatePayload = {
      name: profileForm.name,
      phone: profileForm.phone,
      email: profileForm.email,
      avatar_url,
    };
    const { error, data: updateData } = await supabase
      .from('admins')
      .update(updatePayload)
      .eq('id', user.id)
      .select();
    setProfileLoading(false);
    if (!error) {
      // Fetch updated user from DB
      const { data: updatedUser, error: fetchError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .single();
      if (updatedUser) {
        const newUser = { ...user, ...updatedUser, role: 'admin' };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
      }
      setEditMode(false);
      setAvatarFile(null);
    } else {
      console.error('[DEBUG] AdminProfile: update error', error);
      alert('Failed to update profile: ' + error.message);
    }
  };

  // Add real password update handler
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    // Verify current password
    const ok = await authService.verifyAdminPassword(user.id, passwordForm.current);
    if (!ok) {
      setPasswordError('Current password is incorrect.');
      setPasswordLoading(false);
      return;
    }
    // Hash new password and update
    const password_hash = btoa(passwordForm.new); // In production, use bcrypt
    const { error } = await supabase
      .from('admins')
      .update({ password_hash })
      .eq('id', user.id);
    setPasswordLoading(false);
    if (!error) {
      setPasswordForm({ current: '', new: '', confirm: '' });
      setEditMode(false);
      alert('Password updated successfully.');
    } else {
      setPasswordError('Failed to update password: ' + error.message);
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">No user found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Profile</h1>
      <div className="flex items-center space-x-6 mb-8">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-12 h-12 text-blue-600" />
          </div>
        )}
        <div>
          <div className="text-xl font-bold text-gray-900">{user.name}</div>
          <div className="text-gray-600">{user.email}</div>
          <Button variant="primary" className="mt-2 mr-2" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Cancel' : 'Edit Profile'}
          </Button>
          <Button variant="outline" className="mt-2" onClick={() => setChangePasswordOpen(true)}>
            Change Password
          </Button>
        </div>
      </div>
      {!editMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-gray-500">Phone</div>
            <div className="text-sm text-gray-900">{user.phone || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Active</div>
            <div className="text-sm text-gray-900">{user.is_active ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Created At</div>
            <div className="text-sm text-gray-900">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Updated At</div>
            <div className="text-sm text-gray-900">{user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '-'}</div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Name"
            value={profileForm.name}
            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Email"
              value={profileForm.email}
              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
              type="email"
              required
            />
          </div>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Phone"
            value={profileForm.phone}
            onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setAvatarFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            {avatarUploading && <div className="text-xs text-gray-500 mt-1">Uploading...</div>}
            {user.avatar_url && !avatarFile && (
              <img src={user.avatar_url} alt="Profile" className="w-16 h-16 rounded-full mt-2" />
            )}
            {avatarFile && (
              <div className="text-xs text-gray-500 mt-1">Selected: {avatarFile.name}</div>
            )}
          </div>
          <div className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setEditMode(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" disabled={profileLoading || avatarUploading}>{profileLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      )}

      {/* Change Password Modal */}
      <Modal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Change Password">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPasswordError('');
            if (passwordForm.new !== passwordForm.confirm) {
              setPasswordError('New passwords do not match.');
              return;
            }
            setPasswordLoading(true);
            const ok = await authService.verifyAdminPassword(user.id, passwordForm.current);
            if (!ok) {
              setPasswordError('Current password is incorrect.');
              setPasswordLoading(false);
              return;
            }
            const password_hash = btoa(passwordForm.new);
            const { error } = await supabase
              .from('admins')
              .update({ password_hash })
              .eq('id', user.id);
            setPasswordLoading(false);
            if (!error) {
              setPasswordForm({ current: '', new: '', confirm: '' });
              setChangePasswordOpen(false);
              alert('Password updated successfully.');
            } else {
              setPasswordError('Failed to update password: ' + error.message);
            }
          }}
          className="space-y-4"
        >
          {passwordError && <div className="p-2 bg-red-100 text-red-700 rounded">{passwordError}</div>}
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="Current Password"
            value={passwordForm.current}
            onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
            required
          />
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="New Password"
            value={passwordForm.new}
            onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
            required
          />
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="Confirm New Password"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
            required
          />
          <div className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" disabled={passwordLoading}>{passwordLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProfile; 