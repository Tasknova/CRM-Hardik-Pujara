import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, Plus, Trash2, Edit2, Crown, Eye, MoreVertical } from 'lucide-react';
import { Member, ProjectManager } from '../../types';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import MemberForm from './MemberForm';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const MembersList: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedProjectManager, setSelectedProjectManager] = useState<ProjectManager | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isEditingProjectManager, setIsEditingProjectManager] = useState(false);

  // Check if user is project manager (view-only access)
  const isProjectManager = user?.role === 'project_manager';

  const loadMembers = async () => {
    try {
      setLoading(true);
      const [membersData, projectManagersData] = await Promise.all([
        authService.getMembers(),
        authService.getProjectManagers()
      ]);
      setMembers(membersData);
      setProjectManagers(projectManagersData);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleMemberCreated = () => {
    loadMembers();
  };

  // Open edit project manager modal
  const handleEditProjectManager = (pm: ProjectManager) => {
    setSelectedProjectManager(pm);
    setIsEditingProjectManager(true);
    setIsFormOpen(true);
    setShowProfile(false);
  };

  // Open delete confirmation for project manager
  const handleDeleteProjectManagerConfirm = (pm: ProjectManager) => {
    setSelectedProjectManager(pm);
    setDeleteConfirm(true);
    setShowProfile(false);
  };

  // Handle project manager deletion
  const handleDeleteProjectManager = async () => {
    if (!selectedProjectManager) return;
    setError('');
    try {
      await authService.deleteProjectManager(selectedProjectManager.id);
      setShowProfile(false);
      setDeleteConfirm(false);
      setSelectedProjectManager(null);
      loadMembers();
    } catch (err: any) {
      console.error('Error deleting project manager:', err);
      if (err.message && (err.message.includes('foreign key constraint') || err.message.includes('violates foreign key constraint'))) {
        setError(`Cannot delete project manager "${selectedProjectManager.name}" because they have associated projects, tasks, or deals. Please remove these associations first.`);
      } else {
        setError('Failed to delete project manager');
      }
    }
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setSelectedProjectManager(null);
    setShowProfile(true);
    setError('');
  };

  const handleProjectManagerClick = (pm: ProjectManager) => {
    setSelectedProjectManager(pm);
    setSelectedMember(null);
    setShowProfile(true);
    setError('');
  };

  // Open add member modal
  const handleAddMember = () => {
    setIsFormOpen(true);
    setIsEditingProjectManager(false);
    setSelectedMember(null);
    setSelectedProjectManager(null);
    setShowProfile(false);
  };

  // Open edit member modal
  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setIsEditingProjectManager(false);
    setIsFormOpen(true);
    setShowProfile(false);
  };

  // Open delete confirmation
  const handleDeleteConfirm = (member: Member) => {
    setSelectedMember(member);
    setDeleteConfirm(true);
    setShowProfile(false);
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setError('');
    try {
      await authService.deleteMember(selectedMember.id);
      setShowProfile(false);
      setDeleteConfirm(false);
      setSelectedMember(null);
      loadMembers();
      // Show success message
      alert(`Member "${selectedMember.name}" has been successfully deleted. Tasks and comments were removed, other records were preserved.`);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      setError(`Failed to delete member: ${err.message}`);
    }
  };

  const handleUpdate = () => {
    setSelectedMember(null);
    loadMembers();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading team members...</p>
      </div>
    );
  }

  const totalTeamMembers = members.length + projectManagers.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Command Center</h2>
          <p className="text-gray-600">Manage your team members and project managers</p>
          <div className="mt-2">
            <Badge variant="primary" className="text-sm">
              Total Team Members: {totalTeamMembers}
            </Badge>
          </div>
        </div>
        {!isProjectManager && (
          <Button
            icon={Plus}
            onClick={handleAddMember}
          >
            Add Member
          </Button>
        )}
      </div>

      {/* Project Managers Section */}
      {projectManagers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Project Managers</h3>
            <Badge variant="secondary" className="text-xs">
              {projectManagers.length} PM{projectManagers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projectManagers.map((pm) => (
              <Card
                key={pm.id}
                className="relative group border border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-all duration-200"
              >
                {/* Action buttons - top right */}
                {!isProjectManager && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      title="View Details"
                      className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      onClick={() => handleProjectManagerClick(pm)}
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      title="Edit PM"
                      className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      onClick={() => handleEditProjectManager(pm)}
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      title="Delete PM"
                      className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors"
                      onClick={() => handleDeleteProjectManagerConfirm(pm)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
                
                {/* PM Badge */}
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                    PM
                  </Badge>
                </div>

                {/* Card Content */}
                <div className="pt-8 pb-6 px-6 text-center">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-purple-100 overflow-hidden ring-4 ring-purple-100">
                    {pm.avatar_url ? (
                      <img src={pm.avatar_url} alt="Profile" className="w-20 h-20 object-cover rounded-full" />
                    ) : (
                      <Crown className="w-10 h-10 text-purple-500" />
                    )}
                  </div>
                  
                  {/* Name and Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{pm.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 truncate">{pm.email}</p>
                  
                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {pm.phone && (
                      <div className="flex items-center justify-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{pm.phone}</span>
                      </div>
                    )}
                    {pm.department && (
                      <div className="flex items-center justify-center gap-1">
                        <Building className="w-3 h-3" />
                        <span className="truncate">{pm.department}</span>
                      </div>
                    )}
                    {pm.hire_date && (
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {new Date(pm.hire_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="mt-4">
                    <Badge variant={pm.is_active ? 'success' : 'secondary'} className="text-xs">
                      {pm.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Team Members Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <Badge variant="secondary" className="text-xs">
            {members.length} Member{members.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member) => (
            <Card
              key={member.id}
              className="relative group border border-gray-200 bg-white hover:shadow-lg transition-all duration-200"
            >
              {/* Action buttons - top right */}
              {!isProjectManager && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    title="View Details"
                    className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => handleMemberClick(member)}
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    title="Edit Member"
                    className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    onClick={() => handleEditMember(member)}
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    title="Delete Member"
                    className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors"
                    onClick={() => handleDeleteConfirm(member)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              )}

              {/* Card Content */}
              <div className="pt-6 pb-6 px-6 text-center">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-blue-100 overflow-hidden ring-4 ring-blue-100">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="Profile" className="w-20 h-20 object-cover rounded-full" />
                  ) : (
                    <User className="w-10 h-10 text-blue-500" />
                  )}
                </div>
                
                {/* Name and Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{member.name}</h3>
                <p className="text-sm text-gray-600 mb-3 truncate">{member.email}</p>
                
                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  {member.phone && (
                    <div className="flex items-center justify-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{member.phone}</span>
                    </div>
                  )}
                  {member.department && (
                    <div className="flex items-center justify-center gap-1">
                      <Building className="w-3 h-3" />
                      <span className="truncate">{member.department}</span>
                    </div>
                  )}
                  {member.hire_date && (
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Joined {new Date(member.hire_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                {/* Status Badge */}
                <div className="mt-4">
                  <Badge variant={member.is_active ? 'success' : 'secondary'} className="text-xs">
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {totalTeamMembers === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first team member</p>
          {!isProjectManager && (
            <Button
              icon={Plus}
              onClick={handleAddMember}
            >
              Add First Member
            </Button>
          )}
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (selectedMember || selectedProjectManager) && (
        <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Team Member Profile">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {(selectedMember?.avatar_url || selectedProjectManager?.avatar_url) ? (
                  <img src={selectedMember?.avatar_url || selectedProjectManager?.avatar_url} alt="Profile" className="w-12 h-12 object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {selectedMember?.name || selectedProjectManager?.name}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedMember?.email || selectedProjectManager?.email}
                </div>
                {selectedProjectManager && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 mt-1">
                    Project Manager
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">
                  {(selectedMember?.phone || selectedProjectManager?.phone) || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Department</div>
                <div className="text-sm text-gray-900">
                  {(selectedMember?.department || selectedProjectManager?.department) || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Hire Date</div>
                <div className="text-sm text-gray-900">
                  {(selectedMember?.hire_date || selectedProjectManager?.hire_date) 
                    ? new Date(selectedMember?.hire_date || selectedProjectManager?.hire_date!).toLocaleDateString() 
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Active</div>
                <div className="text-sm text-gray-900">
                  {(selectedMember?.is_active || selectedProjectManager?.is_active) ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Created At</div>
                <div className="text-sm text-gray-900">
                  {(selectedMember?.created_at || selectedProjectManager?.created_at) 
                    ? new Date(selectedMember?.created_at || selectedProjectManager?.created_at!).toLocaleDateString() 
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Updated At</div>
                <div className="text-sm text-gray-900">
                  {(selectedMember?.updated_at || selectedProjectManager?.updated_at) 
                    ? new Date(selectedMember?.updated_at || selectedProjectManager?.updated_at!).toLocaleDateString() 
                    : '-'}
                </div>
              </div>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {!isProjectManager && (
              <div className="flex justify-end space-x-3 pt-4">
                {selectedMember && (
                  <>
                    <Button icon={Edit2} onClick={() => handleEditMember(selectedMember)}>
                      Update
                    </Button>
                    <Button icon={Trash2} variant="danger" onClick={() => handleDeleteConfirm(selectedMember)}>
                      Delete
                    </Button>
                  </>
                )}
                {selectedProjectManager && (
                  <>
                    <Button icon={Edit2} onClick={() => handleEditProjectManager(selectedProjectManager)}>
                      Update
                    </Button>
                    <Button icon={Trash2} variant="danger" onClick={() => handleDeleteProjectManagerConfirm(selectedProjectManager)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Member Form Modal (add/edit) */}
      {isFormOpen && (
        <MemberForm
          isOpen={isFormOpen}
          onClose={() => { 
            setIsFormOpen(false); 
            setSelectedMember(null); 
            setSelectedProjectManager(null);
            setIsEditingProjectManager(false);
          }}
          onSuccess={handleMemberCreated}
          initialData={selectedMember || selectedProjectManager || undefined}
          isProjectManager={isEditingProjectManager}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (selectedMember || selectedProjectManager) && (
        <Modal 
          isOpen={deleteConfirm} 
          onClose={() => setDeleteConfirm(false)} 
          title={`Delete ${selectedProjectManager ? 'Project Manager' : 'Member'}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Warning: This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Deleting <strong>{selectedMember?.name || selectedProjectManager?.name}</strong> will:</p>
                    <div className="mt-2">
                      <p className="font-medium text-red-800">Permanently remove:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>All tasks assigned to this member</li>
                        <li>All daily tasks assigned to this member</li>
                        <li>All task comments by this member</li>
                        <li>All leave balances and records</li>
                        <li>All audit logs and sessions</li>
                      </ul>
                    </div>
                    <div className="mt-3">
                      <p className="font-medium text-orange-800">Preserve but update:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>Deals created by this member (creator will be set to null)</li>
                        <li>Team assignments will be removed (deals preserved)</li>
                        <li>Stage assignments will be removed (stages preserved)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>This action will cascade delete all associated records. Are you absolutely sure you want to proceed?</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={selectedProjectManager ? handleDeleteProjectManager : handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Permanently
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MembersList;