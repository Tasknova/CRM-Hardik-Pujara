import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import { User } from 'lucide-react';

const departments = [
  'Engineering', 'Design', 'Marketing', 'Sales',
  'HR', 'Finance', 'Operations', 'Customer Support'
];

const MemberProfile: React.FC = () => {
  const { user, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    hire_date: user?.hire_date || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    let avatar_url = user.avatar_url;
    if (avatarFile) {
      setAvatarUploading(true);
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      // Remove any existing file with the same name (optional, for upsert safety)
      await supabase.storage.from('avatars').remove([fileName]);
      const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
      setAvatarUploading(false);
      if (uploadError) {
        alert('Failed to upload avatar: ' + uploadError.message);
        setProfileLoading(false);
        return;
      }
      // Debug log
      console.log('Avatar uploadData:', uploadData);
      // Try getPublicUrl, fallback to manual construction
      avatar_url = uploadData?.path
        ? supabase.storage.from('avatars').getPublicUrl(uploadData.path).publicUrl
        : user.avatar_url;
      if (!avatar_url && uploadData?.path) {
        avatar_url = `https://mmadclhbsuvkcbibxcsp.supabase.co/storage/v1/object/public/avatars/${uploadData.path}`;
      }
      if (!avatar_url) {
        alert('Failed to get public URL for avatar.');
        setProfileLoading(false);
        return;
      }
    }
    // Fix: If hire_date is empty, set to null
    const hire_date = profileForm.hire_date === '' ? null : profileForm.hire_date;
    const { error } = await supabase
      .from('members')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
        department: profileForm.department,
        hire_date,
        avatar_url,
      })
      .eq('id', user.id);
    setProfileLoading(false);
    if (!error) {
      // Fetch updated user from DB
      const { data: updatedUser } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();
      if (updatedUser) {
        const newUser = { ...user, ...updatedUser };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
      }
      setEditMode(false);
      setAvatarFile(null);
    } else {
      alert('Failed to update profile: ' + error.message);
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-500">No user found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>
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
          <Button variant="primary" className="mt-2" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Cancel' : 'Edit Profile'}
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
            <div className="text-xs text-gray-500">Department</div>
            <div className="text-sm text-gray-900">{user.department || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Hire Date</div>
            <div className="text-sm text-gray-900">{user.hire_date ? new Date(user.hire_date).toLocaleDateString() : '-'}</div>
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
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Email"
            value={user.email}
            disabled
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Phone"
            value={profileForm.phone}
            onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
          />
          <select
            className="w-full border rounded px-3 py-2"
            value={profileForm.department}
            onChange={e => setProfileForm(f => ({ ...f, department: e.target.value }))}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="date"
              placeholder="Hire Date"
              value={profileForm.hire_date || ''}
              onChange={e => setProfileForm(f => ({ ...f, hire_date: e.target.value }))}
            />
          </div>
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
    </div>
  );
};

export default MemberProfile; 