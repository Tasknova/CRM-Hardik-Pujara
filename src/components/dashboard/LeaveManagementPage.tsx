import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Edit, Save, X } from 'lucide-react';

const LeaveManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [projectManagers, setProjectManagers] = useState<any[]>([]);
  const [memberLeaveBalances, setMemberLeaveBalances] = useState<any[]>([]);
  const [pmLeaveBalances, setPmLeaveBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBalances, setEditingBalances] = useState<{[key: string]: boolean}>({});
  const [balanceInputs, setBalanceInputs] = useState<{[key: string]: any}>({});
  const [savingBalance, setSavingBalance] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchMembers(),
          fetchProjectManagers(),
          fetchLeaveBalances()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email')
        .eq('is_active', true);

      if (error) throw error;
      console.log('Members fetched:', data);
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_managers')
        .select('id, name, email')
        .eq('is_active', true);

      if (error) throw error;
      console.log('Project managers fetched:', data);
      setProjectManagers(data || []);
    } catch (error) {
      console.error('Error fetching project managers:', error);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const [memberBalances, pmBalances] = await Promise.all([
        supabase
          .from('member_leave_balances')
          .select('*')
          .eq('year', new Date().getFullYear()),
        supabase
          .from('project_manager_leave_balances')
          .select('*')
          .eq('year', new Date().getFullYear())
      ]);

      if (memberBalances.error) throw memberBalances.error;
      if (pmBalances.error) throw pmBalances.error;

      console.log('Member balances fetched:', memberBalances.data);
      console.log('PM balances fetched:', pmBalances.data);
      setMemberLeaveBalances(memberBalances.data || []);
      setPmLeaveBalances(pmBalances.data || []);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
    }
  };

  const handleEditBalance = (id: string, type: 'member' | 'pm', balance: any) => {
    setEditingBalances(prev => ({ ...prev, [`${type}_${id}`]: true }));
    setBalanceInputs(prev => ({
      ...prev,
      [`${type}_${id}`]: {
        sick_leaves: balance.sick_leaves || balance.sick_leave || 0,
        casual_leaves: balance.casual_leaves || balance.casual_leave || 0,
        paid_leaves: balance.paid_leaves || balance.earned_leave || 0
      }
    }));
  };

  const handleSaveBalance = async (id: string, type: 'member' | 'pm') => {
    setSavingBalance(`${type}_${id}`);
    try {
      const input = balanceInputs[`${type}_${id}`];
      const tableName = type === 'member' ? 'member_leave_balances' : 'project_manager_leave_balances';
      const idField = type === 'member' ? 'member_id' : 'project_manager_id';
      
      const updateData = type === 'member' 
        ? {
            sick_leaves: input.sick_leaves,
            casual_leaves: input.casual_leaves,
            paid_leaves: input.paid_leaves
          }
        : {
            sick_leave: input.sick_leaves,
            casual_leave: input.casual_leaves,
            earned_leave: input.paid_leaves
          };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq(idField, id)
        .eq('year', new Date().getFullYear());

      if (error) throw error;

      setEditingBalances(prev => ({ ...prev, [`${type}_${id}`]: false }));
      fetchLeaveBalances();
    } catch (error) {
      console.error('Error saving balance:', error);
    } finally {
      setSavingBalance(null);
    }
  };

  const handleCancelEdit = (id: string, type: 'member' | 'pm') => {
    setEditingBalances(prev => ({ ...prev, [`${type}_${id}`]: false }));
    setBalanceInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[`${type}_${id}`];
      return newInputs;
    });
  };

  // Filter members and project managers based on search term
  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredProjectManagers = projectManagers.filter(pm => 
    pm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pm.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Loading leave balances...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
        <div className="text-sm text-gray-500">
          Manage leave balances for team members
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by member name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Leave Balances Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800">Leave Balances ({new Date().getFullYear()})</h3>
        
        {/* Member Leave Balances */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-4">Members</h4>
          <div className="grid gap-4">
            {filteredMembers.map(member => {
              const balance = memberLeaveBalances.find(b => b.member_id === member.id);
              const isEditing = editingBalances[`member_${member.id}`];
              const input = balanceInputs[`member_${member.id}`];
              const isSaving = savingBalance === `member_${member.id}`;

              return (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{member.name}</h5>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Sick"
                              value={input?.sick_leaves || 0}
                              onChange={(e) => setBalanceInputs(prev => ({
                                ...prev,
                                [`member_${member.id}`]: {
                                  ...prev[`member_${member.id}`],
                                  sick_leaves: parseInt(e.target.value) || 0
                                }
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Casual"
                              value={input?.casual_leaves || 0}
                              onChange={(e) => setBalanceInputs(prev => ({
                                ...prev,
                                [`member_${member.id}`]: {
                                  ...prev[`member_${member.id}`],
                                  casual_leaves: parseInt(e.target.value) || 0
                                }
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Paid"
                              value={input?.paid_leaves || 0}
                              onChange={(e) => setBalanceInputs(prev => ({
                                ...prev,
                                [`member_${member.id}`]: {
                                  ...prev[`member_${member.id}`],
                                  paid_leaves: parseInt(e.target.value) || 0
                                }
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveBalance(member.id, 'member')}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelEdit(member.id, 'member')}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-gray-500">Sick:</span>
                            <span className="ml-1 font-medium">{balance?.sick_leaves || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Casual:</span>
                            <span className="ml-1 font-medium">{balance?.casual_leaves || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Paid:</span>
                            <span className="ml-1 font-medium">{balance?.paid_leaves || 0}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBalance(member.id, 'member', balance || {})}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Project Manager Leave Balances */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-4">Project Managers</h4>
          <div className="grid gap-4">
            {filteredProjectManagers.map(pm => {
              const balance = pmLeaveBalances.find(b => b.project_manager_id === pm.id);
              const isEditing = editingBalances[`pm_${pm.id}`];
              const input = balanceInputs[`pm_${pm.id}`];
              const isSaving = savingBalance === `pm_${pm.id}`;

              return (
                <Card key={pm.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{pm.name}</h5>
                      <p className="text-sm text-gray-500">{pm.email}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Sick"
                              value={input?.sick_leaves || 0}
                              onChange={(e) => setBalanceInputs(prev => ({
                                ...prev,
                                [`pm_${pm.id}`]: {
                                  ...prev[`pm_${pm.id}`],
                                  sick_leaves: parseInt(e.target.value) || 0
                                }
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Casual"
                              value={input?.casual_leaves || 0}
                              onChange={(e) => setBalanceInputs(prev => ({
                                ...prev,
                                [`pm_${pm.id}`]: {
                                  ...prev[`pm_${pm.id}`],
                                  casual_leaves: parseInt(e.target.value) || 0
                                }
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Earned"
                              value={input?.paid_leaves || 0}
                              onChange={(e) => setBalanceInputs(prev => ({
                                ...prev,
                                [`pm_${pm.id}`]: {
                                  ...prev[`pm_${pm.id}`],
                                  paid_leaves: parseInt(e.target.value) || 0
                                }
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveBalance(pm.id, 'pm')}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelEdit(pm.id, 'pm')}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-gray-500">Sick:</span>
                            <span className="ml-1 font-medium">{balance?.sick_leave || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Casual:</span>
                            <span className="ml-1 font-medium">{balance?.casual_leave || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Earned:</span>
                            <span className="ml-1 font-medium">{balance?.earned_leave || 0}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBalance(pm.id, 'pm', balance || {})}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagementPage;