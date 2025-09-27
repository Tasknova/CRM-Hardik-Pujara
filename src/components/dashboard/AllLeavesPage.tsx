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
      
      // Fetch user names for all unique user IDs
      const userIds = [...new Set(data?.map(leave => leave.user_id) || [])];
      if (userIds.length > 0) {
        const { data: users, error: userError } = await supabase
          .from('members')
          .select('id, name, email')
          .in('id', userIds);
        
        if (!userError && users) {
          const nameMap: Record<string, string> = {};
          users.forEach(user => {
            nameMap[user.id] = user.name;
          });
          setUserNames(nameMap);
        }
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email')
        .eq('is_active', true);

      if (error) throw error;
      setMembers(data || []);
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
          <div className="space-y-4">
            {filteredLeaves.length === 0 ? (
              <Card className="p-8 text-center">
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
                <Card key={leave.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <User className="w-5 h-5 text-gray-500" />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {userNames[leave.user_id] || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-500">{leave.user_id}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Leave Type:</span>
                          <p className="text-sm text-gray-900 capitalize">{leave.leave_type}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Category:</span>
                          <p className="text-sm text-gray-900 capitalize">
                            {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Date(s):</span>
                          <p className="text-sm text-gray-900">
                            {leave.category === 'multi-day' 
                              ? `${format(new Date(leave.from_date), 'MMM dd')} - ${format(new Date(leave.to_date), 'MMM dd, yyyy')}`
                              : format(new Date(leave.leave_date || leave.from_date), 'MMM dd, yyyy')
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Submitted:</span>
                          <p className="text-sm text-gray-900">
                            {format(new Date(leave.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>

                      {leave.reason && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700">Reason:</span>
                          <p className="text-sm text-gray-900 mt-1">{leave.reason}</p>
                        </div>
                      )}

                      {leave.brief_description && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700">Description:</span>
                          <p className="text-sm text-gray-900 mt-1">{leave.brief_description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <Badge className={getStatusColor(leave.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(leave.status)}
                          <span className="capitalize">{leave.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
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
