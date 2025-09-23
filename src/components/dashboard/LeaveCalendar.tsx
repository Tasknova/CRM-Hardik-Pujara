import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Leave } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LeaveForm from './LeaveForm';
import Modal from '../ui/Modal';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  is_recurring?: boolean;
}

interface LeaveCalendarProps {
  leaves: Leave[];
  holidays?: Holiday[];
  onAddLeave: (leave: Omit<Leave, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateLeave?: (leave: Leave) => void;
  onDeleteLeave?: (id: string) => void;
  showUserInfo?: boolean;
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ 
  leaves, 
  holidays = [],
  onAddLeave, 
  onUpdateLeave,
  onDeleteLeave,
  showUserInfo = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editLeave, setEditLeave] = useState<Leave | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getLeaveForDate = (day: number) => {
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaves.find(leave => leave.leave_date === dateString);
  };

  const getHolidayForDate = (day: number) => {
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(holiday => holiday.date === dateString);
  };

  const handleDateClick = (day: number) => {
    // Check if there are any approved or pending leaves for this day
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const leavesForDay = leaves.filter(leave => {
      // Only consider approved or pending leaves
      if (leave.status !== 'approved' && leave.status !== 'pending') {
        return false;
      }
      
      if (leave.category === 'multi-day') {
        if (leave.from_date && leave.to_date) {
          const from = new Date(leave.from_date);
          const to = new Date(leave.to_date);
          const thisDay = new Date(dateString);
          from.setHours(0,0,0,0);
          to.setHours(0,0,0,0);
          thisDay.setHours(0,0,0,0);
          return from <= thisDay && thisDay <= to;
        }
        return false;
      } else {
        return leave.leave_date === dateString;
      }
    });
    
    // Check if this day is a holiday
    const holidayForDay = getHolidayForDate(day);
    
    // Block if there are approved/pending leaves for this day OR if it's a holiday
    if (leavesForDay.length > 0 || holidayForDay) {
      return;
    }
    
    setSelectedDate(dateString);
    setIsFormOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);

  // Add handlers for edit/delete (assume passed as props or implement as needed)
  // Example: const onEdit = (leave) => { ... };
  // Example: const onDelete = (leaveId) => { ... };

  // Helper to get all leaves for the current month (for list display)
  const getLeavesForCurrentMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    return leaves.filter(leave => {
      if (leave.category === 'multi-day') {
        // Show if any part of the leave is in this month
        const from = leave.from_date ? new Date(leave.from_date) : null;
        const to = leave.to_date ? new Date(leave.to_date) : null;
        return (
          (from && from.getFullYear() === year && from.getMonth() + 1 === month) ||
          (to && to.getFullYear() === year && to.getMonth() + 1 === month)
        );
      } else {
        // Single day
        return leave.leave_date && leave.leave_date.startsWith(`${year}-${String(month).padStart(2, '0')}`);
      }
    });
  };

  // Helper to get all leaves (for unified list)
  const getAllLeaves = () => {
    // Sort by date (single-day: leave_date, multi-day: from_date)
    return [...leaves].sort((a, b) => {
      const aDate = a.category === 'multi-day' ? new Date(a.from_date ?? '') : new Date(a.leave_date ?? '');
      const bDate = b.category === 'multi-day' ? new Date(b.from_date ?? '') : new Date(b.leave_date ?? '');
      return aDate.getTime() - bDate.getTime();
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={() => navigateMonth('prev')}
          />
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={() => navigateMonth('next')}
          />
        </div>
        <Button
          icon={Plus}
          onClick={() => setIsFormOpen(true)}
        >
          Add Leave
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="p-2 h-20" />;
          }

          // Find all leaves for this day (single and multi-day) - only show approved leaves in calendar
          const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const leavesForDay = leaves.filter(leave => {
            // Only show approved leaves in the calendar view
            if (leave.status !== 'approved') {
              return false;
            }
            
            if (leave.category === 'multi-day') {
              if (!leave.from_date || !leave.to_date) return false;
              const from = new Date(leave.from_date);
              const to = new Date(leave.to_date);
              const thisDay = new Date(dateString);
              from.setHours(0,0,0,0);
              to.setHours(0,0,0,0);
              thisDay.setHours(0,0,0,0);
              return from <= thisDay && thisDay <= to;
            } else {
              return leave.leave_date === dateString;
            }
          });

          // Check if this day is a holiday
          const holidayForDay = getHolidayForDate(day);
          
          // In the calendar grid, disable if there is ANY leave for the day OR if it's a holiday
          const isDisabled = leavesForDay.length > 0 || !!holidayForDay;

          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`
                p-2 h-20 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                ${isToday ? 'bg-blue-50 border-blue-300' : ''}
                ${holidayForDay ? 'bg-red-100 border-red-400' : ''}
                ${leavesForDay.length > 0 ? 'bg-green-50 border-green-300' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !isDisabled && handleDateClick(day)}
            >
              <div className="flex flex-col h-full">
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day}
                </span>
                {holidayForDay && (
                  <div className="flex-1 mt-1">
                    <div className="text-xs bg-red-200 text-red-900 px-1 py-0.5 rounded truncate font-medium">
                      🎉 {holidayForDay.name}
                    </div>
                  </div>
                )}
                {!holidayForDay && leavesForDay.length > 0 && (
                  <div className="flex-1 mt-1 space-y-1">
                    {leavesForDay.map(leave => (
                      <div key={leave.id} className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded truncate">
                        {leave.category === 'multi-day'
                          ? `Multi-day: ${leave.from_date} to ${leave.to_date}`
                          : leave.leave_type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified All Leaves section below the calendar */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">My Leaves by Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending */}
          <div>
            <h4 className="font-semibold text-yellow-700 mb-2">Pending</h4>
            <div className="space-y-3">
              {getAllLeaves().filter(l => l.status === 'pending').length === 0 && <div className="text-gray-400">No pending leaves.</div>}
              {getAllLeaves().filter(l => l.status === 'pending').map(leave => (
                <div key={leave.id} className="p-3 border rounded bg-yellow-50 flex flex-col gap-1">
                  <div><strong>Type:</strong> {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}</div>
                  {leave.category === 'multi-day' ? (
                    <>
                      <div><strong>From:</strong> {leave.from_date}</div>
                      <div><strong>To:</strong> {leave.to_date}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                      <div><strong>Description:</strong> {leave.brief_description}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Date:</strong> {leave.leave_date}</div>
                      <div><strong>Leave Type:</strong> {leave.leave_type}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                    </>
                  )}
                  <div><strong>Status:</strong> {leave.status}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="primary" onClick={() => { setEditLeave(leave); setEditFormOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => { setDeleteLeaveId(leave.id); setDeleteConfirmOpen(true); }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Approved */}
          <div>
            <h4 className="font-semibold text-green-700 mb-2">Approved</h4>
            <div className="space-y-3">
              {getAllLeaves().filter(l => l.status === 'approved').length === 0 && <div className="text-gray-400">No approved leaves.</div>}
              {getAllLeaves().filter(l => l.status === 'approved').map(leave => (
                <div key={leave.id} className="p-3 border rounded bg-green-50 flex flex-col gap-1">
                  <div><strong>Type:</strong> {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}</div>
                  {leave.category === 'multi-day' ? (
                    <>
                      <div><strong>From:</strong> {leave.from_date}</div>
                      <div><strong>To:</strong> {leave.to_date}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                      <div><strong>Description:</strong> {leave.brief_description}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Date:</strong> {leave.leave_date}</div>
                      <div><strong>Leave Type:</strong> {leave.leave_type}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                    </>
                  )}
                  <div><strong>Status:</strong> {leave.status}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Declined */}
          <div>
            <h4 className="font-semibold text-red-700 mb-2">Declined</h4>
            <div className="space-y-3">
              {getAllLeaves().filter(l => l.status === 'rejected').length === 0 && <div className="text-gray-400">No declined leaves.</div>}
              {getAllLeaves().filter(l => l.status === 'rejected').map(leave => (
                <div key={leave.id} className="p-3 border rounded bg-red-50 flex flex-col gap-1">
                  <div><strong>Type:</strong> {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}</div>
                  {leave.category === 'multi-day' ? (
                    <>
                      <div><strong>From:</strong> {leave.from_date}</div>
                      <div><strong>To:</strong> {leave.to_date}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                      <div><strong>Description:</strong> {leave.brief_description}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Date:</strong> {leave.leave_date}</div>
                      <div><strong>Leave Type:</strong> {leave.leave_type}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                    </>
                  )}
                  <div><strong>Status:</strong> {leave.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LeaveForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDate('');
        }}
        onSubmit={onAddLeave}
        selectedDate={selectedDate}
        leaves={leaves}
      />
      {/* Edit Leave Modal */}
      {editFormOpen && editLeave && (
        <LeaveForm
          isOpen={editFormOpen}
          onClose={() => {
            setEditFormOpen(false);
            setEditLeave(null);
          }}
          onSubmit={leave => {
            if (onUpdateLeave && editLeave) onUpdateLeave({ ...editLeave, ...leave, id: editLeave.id });
            setEditFormOpen(false);
            setEditLeave(null);
          }}
          selectedDate={editLeave?.leave_date || undefined}
          initialData={editLeave}
          noModal={false}
          leaves={leaves}
        />
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Leave">
          <div>Are you sure you want to delete this leave?</div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => {
              if (onDeleteLeave && deleteLeaveId) onDeleteLeave(deleteLeaveId);
              setDeleteLeaveId(null);
              setDeleteConfirmOpen(false);
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default LeaveCalendar;