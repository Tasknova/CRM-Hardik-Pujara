import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Leave } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Calendar, User, Clock, CheckCircle2, XCircle, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import LeaveCalendar from './LeaveCalendar';
import { toast } from 'sonner';

const AllLeavesPage: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLeaves();
    fetchMembers();
    fetchHolidays();
  }, []);

  const fetchLeaves = async () => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
      
      // Fetch user names for all unique user IDs from all user tables
      const userIds = [...new Set(data?.map(leave => leave.user_id) || [])];
      if (userIds.length > 0) {
        const nameMap: Record<string, string> = {};
        
        // Fetch from members table
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, name, email')
          .in('id', userIds);
        
        if (!membersError && members) {
          members.forEach(user => {
            nameMap[user.id] = user.name;
          });
        }
        
        // Fetch from admins table for any missing users
        const missingUserIds = userIds.filter(id => !nameMap[id]);
        if (missingUserIds.length > 0) {
          const { data: admins, error: adminsError } = await supabase
            .from('admins')
            .select('id, name, email')
            .in('id', missingUserIds);
          
          if (!adminsError && admins) {
            admins.forEach(user => {
              nameMap[user.id] = user.name;
            });
          }
        }
        
        // Fetch from project_managers table for any remaining missing users
        const stillMissingUserIds = userIds.filter(id => !nameMap[id]);
        if (stillMissingUserIds.length > 0) {
          const { data: projectManagers, error: pmError } = await supabase
            .from('project_managers')
            .select('id, name, email')
            .in('id', stillMissingUserIds);
          
          if (!pmError && projectManagers) {
            projectManagers.forEach(user => {
              nameMap[user.id] = user.name;
            });
          }
        }
        
        setUserNames(nameMap);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const allMembers: any[] = [];
      
      // Fetch from members table
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, name, email')
        .eq('is_active', true);
      
      if (!membersError && members) {
        allMembers.push(...members);
      }
      
      // Fetch from admins table
      const { data: admins, error: adminsError } = await supabase
        .from('admins')
        .select('id, name, email');
      
      if (!adminsError && admins) {
        allMembers.push(...admins);
      }
      
      // Fetch from project_managers table
      const { data: projectManagers, error: pmError } = await supabase
        .from('project_managers')
        .select('id, name, email');
      
      if (!pmError && projectManagers) {
        allMembers.push(...projectManagers);
      }
      
      setMembers(allMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .gte('date', '2025-01-01')
        .lte('date', '2025-12-31')
        .order('date');

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const calculateLeaveDaysBreakdown = (leave: Leave) => {
    if (leave.category !== 'multi-day' || !leave.from_date || !leave.to_date) {
      return null;
    }

    let totalDays = 0;
    let sundays = 0;
    let holidayCount = 0;
    let alreadyLeave = 0;
    let leaveDays = 0;

    const startDate = new Date(leave.from_date);
    const endDate = new Date(leave.to_date);
    const currentDate = new Date(startDate);

    // Create a set of holiday dates for quick lookup
    const holidayDates = new Set(holidays.map(h => h.date));

    while (currentDate <= endDate) {
      totalDays++;
      const dayStr = currentDate.toISOString().split('T')[0];
      
      if (currentDate.getDay() === 0) {
        sundays++;
      } else if (holidayDates.has(dayStr)) {
        holidayCount++;
      } else {
        // Check if this day is already taken by another leave
        const isAlreadyLeave = leaves.some(existingLeave => {
          if (existingLeave.id === leave.id) return false; // Don't count the current leave
          if (existingLeave.status !== 'approved' && existingLeave.status !== 'pending') return false;
          
          if (existingLeave.category === 'multi-day' && existingLeave.from_date && existingLeave.to_date) {
            const existingStart = new Date(existingLeave.from_date);
            const existingEnd = new Date(existingLeave.to_date);
            return currentDate >= existingStart && currentDate <= existingEnd;
          } else if (existingLeave.leave_date) {
            const existingDate = new Date(existingLeave.leave_date);
            return currentDate.toDateString() === existingDate.toDateString();
          }
          return false;
        });
        
        if (isAlreadyLeave) {
          alreadyLeave++;
        } else {
          leaveDays++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalDays,
      sundays,
      holidays: holidayCount,
      alreadyLeave,
      leaveDays
    };
  };

  const filteredLeaves = leaves.filter(leave => {
    const matchesStatus = filter === 'all' || leave.status === filter;
    const matchesMember = memberFilter === 'all' || leave.user_id === memberFilter;
    const userName = userNames[leave.user_id] || 'Unknown User';
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leave.leave_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesMember && matchesSearch;
  });

  const handleAddLeave = async (leaveData: any) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .insert([leaveData]);

      if (error) throw error;
      fetchLeaves();
    } catch (error) {
      console.error('Error adding leave:', error);
    }
  };

  const handleUpdateLeave = async (leave: Leave) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .update(leave)
        .eq('id', leave.id);

      if (error) throw error;
      fetchLeaves();
    } catch (error) {
      console.error('Error updating leave:', error);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLeaves();
    } catch (error) {
      console.error('Error deleting leave:', error);
    }
  };

  const handleApproveDeclineLeave = async (leaveId: string, status: 'approved' | 'rejected', userId: string, leaveDate: string, endDate: string | null, leaveType: string, category?: string, from_date?: string | null, to_date?: string | null) => {
    // Fetch the full leave object first
    const { data: leave, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', leaveId)
      .single();
    if (leaveError || !leave) {
      toast.error('Failed to fetch leave for approval.');
      return;
    }
    const prevStatus = leave.status;
    // Only proceed if the status is actually changing
    if (prevStatus === status) {
      toast.error(`Leave is already ${status}.`);
      return;
    }
    // Update leave status only - don't pass the full leave object
    const { error: updateError } = await supabase
      .from('leaves')
      .update({ status })
      .eq('id', leaveId);

    if (updateError) {
      toast.error('Failed to update leave status.');
      return;
    }

    // Fetch the leave again to confirm status
    const { data: updatedLeave, error: updatedLeaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', leaveId)
      .single();
    if (updatedLeaveError || !updatedLeave) {
      toast.error('Failed to fetch leave after approval.');
      return;
    }

    // Send notification to member
    const isApproved = status === 'approved';
    const notifType = isApproved ? 'leave_approved' : 'leave_rejected';
    const notifTitle = isApproved ? 'Leave Approved' : 'Leave Rejected';
    let leaveDateStr = '';
    if (updatedLeave.category === 'multi-day' && updatedLeave.from_date && updatedLeave.to_date) {
      leaveDateStr = `Type: Multi-day | From: ${updatedLeave.from_date} | To: ${updatedLeave.to_date} | Leave Type: ${updatedLeave.leave_type}`;
    } else {
      leaveDateStr = `Type: Single Day | Date: ${updatedLeave.leave_date} | Leave Type: ${updatedLeave.leave_type}`;
    }
    const notifMsg = isApproved
      ? `Your leave request (${leaveDateStr}) has been approved.`
      : `Your leave request (${leaveDateStr}) has been declined.`;
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error sending notification:', error);
    }

    toast.success(`Leave ${status} successfully!`);
    fetchLeaves(); // Refresh the leaves list
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Loading leaves...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">All Leaves</h2>
        <div className="flex gap-2">
          <Button
            variant={view === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            List View
          </Button>
          <Button
            variant={view === 'calendar' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            Calendar View
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by member name or leave type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Members</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                    className="capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Leave Requests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeaves.length === 0 ? (
              <Card className="p-8 text-center col-span-full">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leaves found</h3>
                <p className="text-gray-500">
                  {searchTerm || filter !== 'all' || memberFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No leave requests have been submitted yet.'
                  }
                </p>
              </Card>
            ) : (
              filteredLeaves.map((leave) => (
                <Card key={leave.id} className="p-4 max-w-md bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg">
                  {/* Header with user info and status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">
                          {userNames[leave.user_id] || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(leave.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <Badge className={`${getStatusColor(leave.status)} px-3 py-1 rounded-full text-xs font-medium`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(leave.status)}
                        <span className="capitalize">{leave.status}</span>
                      </div>
                    </Badge>
                  </div>

                  {/* Leave details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Leave Type</span>
                      <span className="text-sm font-semibold text-gray-900 capitalize bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {leave.leave_type}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Category</span>
                      <span className="text-sm text-gray-900 capitalize">
                        {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Date(s)</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {leave.category === 'multi-day' 
                          ? `${format(new Date(leave.from_date), 'MMM dd')} - ${format(new Date(leave.to_date), 'MMM dd, yyyy')}`
                          : format(new Date(leave.leave_date || leave.from_date), 'MMM dd, yyyy')
                        }
                      </span>
                    </div>
                  </div>

                  {/* Leave Days Breakdown for Multi-day leaves */}
                  {leave.category === 'multi-day' && (() => {
                    const breakdown = calculateLeaveDaysBreakdown(leave);
                    return breakdown ? (
                      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">Leave Days Breakdown</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Days:</span>
                            <span className="font-medium text-gray-800">{breakdown.totalDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sundays:</span>
                            <span className="font-medium text-gray-800">{breakdown.sundays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Holidays:</span>
                            <span className="font-medium text-gray-800">{breakdown.holidays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Already Leave:</span>
                            <span className="font-medium text-gray-800">{breakdown.alreadyLeave}</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-blue-800">Total Leave Days:</span>
                            <span className="text-lg font-bold text-blue-900">{breakdown.leaveDays}</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Reason and Description */}
                  {leave.reason && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-600 block mb-1">Reason</span>
                      <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded border">{leave.reason}</p>
                    </div>
                  )}

                  {leave.brief_description && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-600 block mb-1">Description</span>
                      <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded border">{leave.brief_description}</p>
                    </div>
                  )}

                  {/* Action buttons for pending leaves - only show for admin users */}
                  {leave.status === 'pending' && user?.role === 'admin' && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        onClick={() => handleApproveDeclineLeave(
                          leave.id, 
                          'approved', 
                          leave.user_id, 
                          leave.leave_date, 
                          leave.end_date ?? null, 
                          leave.leave_type, 
                          leave.category, 
                          leave.from_date, 
                          leave.to_date
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        onClick={() => handleApproveDeclineLeave(
                          leave.id, 
                          'rejected', 
                          leave.user_id, 
                          leave.leave_date, 
                          leave.end_date ?? null, 
                          leave.leave_type, 
                          leave.category, 
                          leave.from_date, 
                          leave.to_date
                        )}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <LeaveCalendar
          leaves={leaves}
          holidays={holidays}
          onAddLeave={handleAddLeave}
          onUpdateLeave={handleUpdateLeave}
          onDeleteLeave={handleDeleteLeave}
          showUserInfo={true}
        />
      )}
    </div>
  );
};

export default AllLeavesPage;
