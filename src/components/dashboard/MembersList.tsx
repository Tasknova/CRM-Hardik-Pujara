import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, Plus, Trash2, Edit2, Crown, Eye } from 'lucide-react';
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
    } catch (err) {
      setError('Failed to delete project manager');
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
    } catch (err) {
      setError('Failed to delete member');
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
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Project Managers</h3>
            <Badge variant="secondary" className="text-xs">
              {projectManagers.length} PM{projectManagers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectManagers.map((pm) => (
              <Card
                key={pm.id}
                hover
                className="relative cursor-pointer border-purple-200 bg-gradient-to-br from-purple-50 to-white"
                onClick={() => handleProjectManagerClick(pm)}
              >
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    PM
                  </Badge>
                </div>
                {/* Action buttons for PMs */}
                {!isProjectManager && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      title="View PM"
                      className="bg-white border p-1 shadow rounded hover:bg-gray-50"
                      onClick={e => {
                        e.stopPropagation();
                        handleProjectManagerClick(pm);
                      }}
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      title="Edit PM"
                      className="bg-white border p-1 shadow rounded hover:bg-gray-50"
                      onClick={e => {
                        e.stopPropagation();
                        handleEditProjectManager(pm);
                      }}
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      title="Delete PM"
                      className="bg-white border p-1 shadow rounded hover:bg-gray-50"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteProjectManagerConfirm(pm);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-purple-100 overflow-hidden">
                    {pm.avatar_url ? (
                      <img src={pm.avatar_url} alt="Profile" className="w-16 h-16 object-cover rounded-full" />
                    ) : (
                      <Crown className="w-8 h-8 text-purple-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{pm.name}</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>{pm.email}</div>
                    {pm.phone && <div>{pm.phone}</div>}
                    {pm.department && <div>{pm.department}</div>}
                    {pm.hire_date && <div>Joined {new Date(pm.hire_date).toLocaleDateString()}</div>}
                  </div>
                  <div className="mt-2">
                    <Badge variant={pm.is_active ? 'success' : 'secondary'}>
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
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <Badge variant="secondary" className="text-xs">
            {members.length} Member{members.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <Card
              key={member.id}
              hover
              className="relative cursor-pointer"
              onClick={() => handleMemberClick(member)}
            >
              {member.department !== undefined && (
                <>
                  {!isProjectManager && (
                    <div className="absolute top-2 left-2 flex gap-1">
                      <button
                        title="View Member"
                        className="bg-white border p-1 shadow rounded hover:bg-gray-50"
                        onClick={e => {
                          e.stopPropagation();
                          handleMemberClick(member);
                        }}
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        title="Edit Member"
                        className="bg-white border p-1 shadow rounded hover:bg-gray-50"
                        onClick={e => {
                          e.stopPropagation();
                          handleEditMember(member);
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        title="Delete Member"
                        className="bg-white border p-1 shadow rounded hover:bg-gray-50"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteConfirm(member);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </>
              )}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100 overflow-hidden">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="Profile" className="w-16 h-16 object-cover rounded-full" />
                  ) : (
                    <User className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <div>{member.email}</div>
                  {member.phone && <div>{member.phone}</div>}
                  {member.department && <div>{member.department}</div>}
                  {member.hire_date && <div>Joined {new Date(member.hire_date).toLocaleDateString()}</div>}
                </div>
                <div className="mt-2">
                  <Badge variant={member.is_active ? 'success' : 'secondary'}>
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
        >
          <div>
            Are you sure you want to delete {selectedMember?.name || selectedProjectManager?.name}?
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button 
              variant="danger" 
              onClick={selectedProjectManager ? handleDeleteProjectManager : handleDelete}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MembersList;