import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Leave } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

interface LeaveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leave: any) => void;
  selectedDate?: string;
  initialData?: any;
  noModal?: boolean;
  leaves: Leave[];
  holidays?: { id: string; name: string; date: string; description?: string; is_recurring?: boolean; }[];
}

const LeaveForm: React.FC<LeaveFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedDate, 
  initialData, 
  noModal = false,
  leaves,
  holidays = []
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    category: 'single-day',
    leave_date: '',
    from_date: '',
    to_date: '',
    leave_type: 'casual' as Leave['leave_type'],
    reason: '',
    brief_description: '',
    user_id: user?.id || '',
    end_date: '',
    id: undefined,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const [error, setError] = useState('');
  const [fetchedHolidays, setFetchedHolidays] = useState<string[]>([]); // store as array of date strings
  const [leaveBalance, setLeaveBalance] = useState<{ sick_leaves: number; casual_leaves: number; paid_leaves: number } | null>(null);

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        category: initialData.category || 'single-day',
        leave_date: initialData.leave_date || '',
        from_date: initialData.from_date || '',
        to_date: initialData.to_date || '',
        leave_type: initialData.leave_type || 'casual',
        reason: initialData.reason || '',
        brief_description: initialData.brief_description || '',
        user_id: initialData.user_id || user?.id || '',
        end_date: initialData.end_date || '',
        id: initialData.id,
      });
    } else if (selectedDate) {
      setFormData(prev => ({ ...prev, leave_date: selectedDate }));
    }
  }, [initialData, isOpen, selectedDate, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen && !initialData) {
      setFormData({
        category: 'single-day',
        leave_date: '',
        from_date: '',
        to_date: '',
        leave_type: 'casual',
        reason: '',
        brief_description: '',
        user_id: user?.id || '',
        end_date: '',
        id: undefined,
      });
      setError('');
    }
  }, [isOpen, initialData, user?.id]);

  useEffect(() => {
    if (isOpen && user?.role === 'member' && !initialData) {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [isOpen, user, initialData]);

  useEffect(() => {
    // Fetch holidays for the current cycle
    const fetchHolidays = async () => {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('date')
        .gte('date', '2025-01-01') // Use the same cycle as before
        .lte('date', '2026-12-31'); // Use the same cycle as before
      if (!error && data) {
        setFetchedHolidays(data.map((h: any) => h.date));
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    // Fetch leave balance for the current user (supports members, admins, and project managers)
    const fetchLeaveBalance = async () => {
      if (!user?.id) return;
      
      // First try to find balance for member
      let { data, error } = await supabase
        .from('member_leave_balances')
        .select('sick_leaves, casual_leaves, paid_leaves')
        .eq('member_id', user.id)
        .eq('year', new Date().getFullYear())
        .single();
      
      // If not found as member, try as admin
      if (error || !data) {
        const { data: adminData, error: adminError } = await supabase
          .from('member_leave_balances')
          .select('sick_leaves, casual_leaves, paid_leaves')
          .eq('admin_id', user.id)
          .eq('year', new Date().getFullYear())
          .single();
        
        data = adminData;
        error = adminError;
      }
      
      // If not found as admin, try as project manager in the correct table
      if (error || !data) {
        const { data: pmData, error: pmError } = await supabase
          .from('project_manager_leave_balances')
          .select('sick_leave, casual_leave, earned_leave')
          .eq('project_manager_id', user.id)
          .eq('year', new Date().getFullYear())
          .single();
        
        if (!pmError && pmData) {
          // Map the project manager leave balance fields to the expected format
          setLeaveBalance({
            sick_leaves: pmData.sick_leave,
            casual_leaves: pmData.casual_leave,
            paid_leaves: pmData.earned_leave,
          });
          return;
        }
        
        data = pmData;
        error = pmError;
      }
      
      if (!error && data) {
        setLeaveBalance(data);
      }
    };
    
    if (isOpen && user?.id) {
      fetchLeaveBalance();
    }
  }, [isOpen, user?.id]);

  // Helper function to check if a date is valid for selection
  const isDateSelectable = (dateStr: string, isMultiDay: boolean = false) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    // Check if date is in the past
    if (date < today) {
      return { valid: false, reason: 'Past dates are not selectable.' };
    }
    
    // Check if date is a company holiday
    const allHolidays = [...fetchedHolidays, ...holidays.map(h => h.date)];
    if (allHolidays.includes(dateStr)) {
      return { valid: false, reason: 'Company holidays are not selectable.' };
    }
    
    // For multi-day leaves, check if date is Sunday
    if (isMultiDay && date.getDay() === 0) {
      return { valid: false, reason: 'Sundays are not selectable for multi-day leaves.' };
    }
    
    // Check if date is already booked (excluding current leave being edited)
    const isAlreadyBooked = leaves.some(leave => {
      // Skip current leave being edited
      if (initialData && leave.id === initialData.id) return false;
      
      if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
        const fromDate = new Date(leave.from_date);
        const toDate = new Date(leave.to_date);
        return date >= fromDate && date <= toDate;
      } else if (leave.leave_date) {
        return new Date(leave.leave_date).getTime() === date.getTime();
      }
      return false;
    });
    
    if (isAlreadyBooked) {
      return { valid: false, reason: 'This date overlaps with an existing leave.' };
    }
    
    return { valid: true, reason: '' };
  };

  // Helper function to validate leave balance
  const validateLeaveBalance = (leaveType: string, requestedDays: number): boolean => {
    if (!leaveBalance) {
      toast.error('❌ Unable to fetch leave balance. Please try again.', {
        autoClose: 4000,
      });
      return false;
    }

    let availableBalance = 0;
    let leaveTypeName = '';

    switch (leaveType) {
      case 'sick':
        availableBalance = leaveBalance.sick_leaves;
        leaveTypeName = 'sick';
        break;
      case 'casual':
        availableBalance = leaveBalance.casual_leaves;
        leaveTypeName = 'casual';
        break;
      case 'paid':
        availableBalance = leaveBalance.paid_leaves;
        leaveTypeName = 'paid';
        break;
      default:
        toast.error('❌ Invalid leave type selected.', {
          autoClose: 4000,
        });
        return false;
    }

    if (requestedDays > availableBalance) {
      toast.error(`❌ Insufficient ${leaveTypeName} leave balance. Available: ${availableBalance}, Requested: ${requestedDays}`, {
        autoClose: 5000,
      });
      setError(`Insufficient ${leaveTypeName} leave balance. You have ${availableBalance} ${leaveTypeName} leaves remaining.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let requestedDays = 1;
    if (formData.category === 'single-day') {
      if (!formData.leave_date) {
        setError('Please select a leave date.');
        return;
      }
      if (bookedDatesSet.has(formData.leave_date)) {
        setError('This date is already booked or is a holiday. Please select another date.');
        toast.error('❌ This date is already booked or is a holiday.', { autoClose: 4000 });
        return;
      }
      const validation = isDateSelectable(formData.leave_date, false);
      if (!validation.valid) {
        setError(validation.reason);
        return;
      }
      if (!validateLeaveBalance(formData.leave_type, 1)) {
        return;
      }
      requestedDays = 1;
      formData.from_date = '';
      formData.to_date = '';
    } else {
      if (!formData.from_date || !formData.to_date) {
        setError('Please select both from and to dates.');
        return;
      }
      const fromValidation = isDateSelectable(formData.from_date, true);
      if (!fromValidation.valid) {
        setError(`From date: ${fromValidation.reason}`);
        return;
      }
      const toValidation = isDateSelectable(formData.to_date, true);
      if (!toValidation.valid) {
        setError(`To date: ${toValidation.reason}`);
        return;
      }
      if (new Date(formData.from_date) > new Date(formData.to_date)) {
        setError('From date cannot be after to date.');
        return;
      }
      const fromDate = new Date(formData.from_date);
      const toDate = new Date(formData.to_date);
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const validation = isDateSelectable(dateStr, true);
        const isFromOrToDate = dateStr === formData.from_date || dateStr === formData.to_date;
        if (!validation.valid) {
          // Only block for from/to dates if overlap with existing leave
          if (validation.reason.includes('This date overlaps with an existing leave.') && !isFromOrToDate) {
            continue;
          }
          if (validation.reason.includes('Sundays')) continue;
          if (validation.reason.includes('Company holidays') && !isFromOrToDate) continue;
          setError(`Date ${dateStr}: ${validation.reason}`);
          return;
        }
      }
      const daysInfo = getDaysInfo(formData.from_date, formData.to_date, leaves);
      requestedDays = daysInfo.leaveDays;
      if (!validateLeaveBalance(formData.leave_type, requestedDays)) {
        return;
      }
      formData.leave_date = '';
    }
    setError('');
    // Note: Leave balance will be deducted automatically when the leave is approved by admin
    onSubmit(formData);
    setFormData({
      category: 'single-day',
      leave_date: '',
      from_date: '',
      to_date: '',
      leave_type: 'casual',
      reason: '',
      brief_description: '',
      user_id: user?.id || '',
      end_date: '',
      id: undefined,
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Custom onChange for date fields with comprehensive validation
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (!value) {
      setFormData(prev => ({ ...prev, [name]: value }));
      setError('');
      return;
    }
    
    const isMultiDay = formData.category === 'multi-day';
    const validation = isDateSelectable(value, isMultiDay);
    
    if (!validation.valid) {
      toast.error(`❌ Date not selectable: ${validation.reason}`, {
        style: { background: '#ef4444', color: 'white' },
        autoClose: 4000,
      });
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Helper to count total days, Sundays, already leave days, and holidays in a range
  function getDaysInfo(fromDate: string, toDate: string, existingLeaves: Leave[]) {
    if (!fromDate || !toDate) return { total: 0, sundays: 0, alreadyLeave: 0, holidays: 0, leaveDays: 0 };
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let total = 0;
    let sundays = 0;
    let alreadyLeave = 0;
    let holidaysCount = 0;
    
    // Combine all holiday dates
    const allHolidays = [...fetchedHolidays, ...holidays.map(h => h.date)];
    
    // Build set of already booked days
    const leaveDatesSet = new Set<string>();
    existingLeaves.forEach(leave => {
      if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
        let d = new Date(leave.from_date);
        const to2 = new Date(leave.to_date);
        while (d <= to2) {
          leaveDatesSet.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      } else if (leave.leave_date) {
        leaveDatesSet.add(new Date(leave.leave_date).toISOString().split('T')[0]);
      }
    });
    let leaveDays = 0;
    let idx = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      total++;
      const dayStr = d.toISOString().split('T')[0];
      if (d.getDay() === 0) {
        sundays++;
      } else if (leaveDatesSet.has(dayStr)) {
        alreadyLeave++;
      } else if (allHolidays.includes(dayStr)) {
        holidaysCount++;
      } else {
        leaveDays++;
      }
      idx++;
    }
    return { total, sundays, alreadyLeave, holidays: holidaysCount, leaveDays };
  }

  // Build set of already booked days (excluding Sundays)
  const bookedDatesSet = new Set<string>();
  leaves.forEach(leave => {
    if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
      let d = new Date(leave.from_date);
      const to2 = new Date(leave.to_date);
      while (d <= to2) {
        if (d.getDay() !== 0) bookedDatesSet.add(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }
    } else if (leave.leave_date) {
      const d = new Date(leave.leave_date);
      if (d.getDay() !== 0) bookedDatesSet.add(d.toISOString().split('T')[0]);
    }
  });
  // Add holidays to bookedDatesSet for blocking selection
  const allHolidays = [...fetchedHolidays, ...holidays.map(h => h.date)];
  allHolidays.forEach(date => bookedDatesSet.add(date));

  // Define current cycle
  const cycleStart = '2025-01-01';
  const cycleEnd = '2026-12-31';

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="single-day">Single Day</option>
          <option value="multi-day">Multi Day</option>
        </select>
      </div>

      {formData.category === 'single-day' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Date
            </label>
            <input
              type="date"
              name="leave_date"
              value={formData.leave_date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min={cycleStart}
              max={cycleEnd}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="paid">Paid Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide a reason for your leave..."
              required
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Reason
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="from_date"
              value={formData.from_date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min={todayStr}
              max={cycleEnd}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="to_date"
              value={formData.to_date}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min={formData.from_date || todayStr}
              max={cycleEnd}
            />
          </div>
          {/* Days calculator */}
          {formData.from_date && formData.to_date && (
            <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-1">
              {(() => {
                const info = getDaysInfo(formData.from_date, formData.to_date, leaves);
                return <>
                  <span className="font-semibold">Total days:</span> {info.total} &nbsp;|&nbsp;
                  <span className="font-semibold">Sundays:</span> {info.sundays} &nbsp;|&nbsp;
                  <span className="font-semibold">Holidays:</span> {info.holidays} &nbsp;|&nbsp;
                  <span className="font-semibold">Already leave:</span> {info.alreadyLeave} &nbsp;|&nbsp;
                  <span className="font-semibold">Leave days:</span> {info.leaveDays}
                </>;
              })()}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Leave Type</option>
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="paid">Paid Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Brief Description
            </label>
            <textarea
              name="brief_description"
              value={formData.brief_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your multi-day leave..."
              required
            />
          </div>
        </>
      )}

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Leave' : 'Request Leave'}
        </Button>
      </div>
    </form>
  );

  if (noModal) {
    return formContent;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Leave' : 'Add Leave Request'}>
      {formContent}
    </Modal>
  );
};

export default LeaveForm;