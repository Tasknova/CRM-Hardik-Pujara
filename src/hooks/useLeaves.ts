import { useState, useEffect, useRef } from 'react';
import { Leave, LeaveFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useLeaves = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadLeaves = async () => {
      setLoading(true);
      let query = supabase
        .from('leaves')
        .select('*'); // Don't join member data, we'll fetch user data manually
      if (user?.role !== 'admin' && user?.role !== 'project_manager') {
        query = query.eq('user_id', user?.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching leaves:', error);
        if (isMounted) setLeaves([]);
      } else {
        // Manually fetch user data for each leave
        const leavesWithUsers = await Promise.all((data || []).map(async (leave) => {
          // Try to find user in members table first
          let { data: memberUser, error: memberError } = await supabase
            .from('members')
            .select('id, name, email')
            .eq('id', leave.user_id)
            .maybeSingle();
          
          // If not found in members, try admins table
          if (!memberUser && !memberError) {
            let { data: adminUser, error: adminError } = await supabase
              .from('admins')
              .select('id, name, email')
              .eq('id', leave.user_id)
              .maybeSingle();
            if (!adminError) {
              memberUser = adminUser;
            }
          }
          
          // If not found in admins, try project managers table
          if (!memberUser) {
            let { data: pmUser, error: pmError } = await supabase
              .from('project_managers')
              .select('id, name, email')
              .eq('id', leave.user_id)
              .maybeSingle();
            if (!pmError) {
              memberUser = pmUser;
            }
          }
          
          return {
            ...leave,
            user: memberUser
          };
        }));
        
        if (isMounted) setLeaves(leavesWithUsers);
      }
      if (isMounted) setLoading(false);
    };
    if (user) loadLeaves();

    // Setup Supabase real-time subscription
    if (user) {
      // Unsubscribe previous if any
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      // Subscribe to all changes on 'leaves'
      const channel = supabase.channel('leaves-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leaves',
          },
          async (payload) => {
            // Refetch all leaves on any change (insert/update/delete)
            await loadLeaves();
          }
        )
        .subscribe();
      subscriptionRef.current = channel;
    }
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user]);

  // Helper to count non-Sunday and non-holiday days in a date range (inclusive)
  async function countNonSundayAndNonHolidayDays(fromDate: string, toDate: string): Promise<number> {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let count = 0;
    
    // Fetch holidays for the current year
    const currentYear = new Date().getFullYear();
    const { data: holidays } = await supabase
      .from('company_holidays')
      .select('date')
      .eq('year', currentYear);
    
    const holidayDates = new Set(holidays?.map(h => h.date) || []);
    
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      if (d.getDay() !== 0 && !holidayDates.has(dateStr)) { // Not Sunday and not a holiday
        count++;
      }
    }
    return count;
  }

  // Helper to count non-Sunday days in a date range (inclusive) - for backward compatibility
  function countNonSundayDays(fromDate: string, toDate: string): number {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let count = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) count++; // 0 = Sunday
    }
    return count;
  }

  // Helper to check if a date is Sunday
  function isSunday(dateStr: string): boolean {
    return new Date(dateStr).getDay() === 0;
  }

  // Helper to check if all days in a range are Sundays
  function allSundays(fromDate: string, toDate: string): boolean {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) return false;
    }
    return true;
  }

  // Helper function to check leave balance
  // (No decrement here, just check)
  const checkLeaveBalance = async (
    userId: string,
    leaveType: string,
    daysRequested?: number,
    excludeLeaveId?: string,
    leaveData?: any,
    payload?: any
  ) => {
    // 1. Get user's leave balance for current year (check both members and project managers)
    const currentYear = new Date().getFullYear();
    
    // First try to find balance for member
    let { data: balance, error: balanceError } = await supabase
      .from('member_leave_balances')
      .select('sick_leaves, casual_leaves, paid_leaves')
      .eq('member_id', userId)
      .eq('year', currentYear)
      .single();

    // If not found as member, try as admin
    if (balanceError || !balance) {
      const { data: adminBalance, error: adminBalanceError } = await supabase
        .from('member_leave_balances')
        .select('sick_leaves, casual_leaves, paid_leaves')
        .eq('admin_id', userId)
        .eq('year', currentYear)
        .single();
      
      balance = adminBalance;
      balanceError = adminBalanceError;
    }

    // If not found as admin, try as project manager in member_leave_balances
    if (balanceError || !balance) {
      const { data: pmBalance, error: pmBalanceError } = await supabase
        .from('member_leave_balances')
        .select('sick_leaves, casual_leaves, paid_leaves')
        .eq('project_manager_id', userId)
        .eq('year', currentYear)
        .single();
      
      balance = pmBalance;
      balanceError = pmBalanceError;
    }

    // If not found in member_leave_balances, try project_manager_leave_balances
    if (balanceError || !balance) {
      const { data: pmBalance, error: pmBalanceError } = await supabase
        .from('project_manager_leave_balances')
        .select('sick_leave, casual_leave, earned_leave')
        .eq('project_manager_id', userId)
        .eq('year', currentYear)
        .single();
      
      if (!pmBalanceError && pmBalance) {
        // Map the project manager leave balance fields to the expected format
        balance = {
          sick_leaves: pmBalance.sick_leave,
          casual_leaves: pmBalance.casual_leave,
          paid_leaves: pmBalance.earned_leave,
        };
        balanceError = null;
      } else {
        balance = pmBalance;
        balanceError = pmBalanceError;
      }
    }

    if (balanceError || !balance) {
      console.error('Error fetching leave balance:', balanceError);
      throw new Error('Could not fetch leave balance.');
    }

    // 2. Get all approved/pending leaves of this type
    const query = supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .eq('leave_type', leaveType)
      .in('status', ['approved', 'pending']);

    // If updating, exclude current leave
    if (excludeLeaveId) {
      query.not('id', 'eq', excludeLeaveId);
    }

    const { data: existingLeaves, error: leavesError } = await query;

    if (leavesError) {
      console.error('Error fetching existing leaves:', leavesError);
      throw new Error('Could not fetch existing leaves.');
    }

    // 3. Calculate used days (for overlap check)
    let leaveDatesSet = new Set<string>();
    existingLeaves?.forEach(leave => {
      if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
        let d = new Date(leave.from_date);
        const to = new Date(leave.to_date);
        while (d <= to) {
          leaveDatesSet.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      } else if (leave.leave_date) {
        leaveDatesSet.add(new Date(leave.leave_date).toISOString().split('T')[0]);
      }
    });

         // 4. For the new leave, count only days that are not Sundays, not holidays, and not already in leaveDatesSet
     if (daysRequested === undefined) {
       let alreadyLeaveDays = 0;
       
       // Fetch holidays for the current year
       const currentYear = new Date().getFullYear();
       const { data: holidays } = await supabase
         .from('company_holidays')
         .select('date')
         .eq('year', currentYear);
       
       const holidayDates = new Set(holidays?.map(h => h.date) || []);
       
       if (excludeLeaveId && payload) {
         if (payload.category === 'multi-day' && payload.from_date && payload.to_date) {
           let d = new Date(payload.from_date);
           const to = new Date(payload.to_date);
           let isStartBooked = false;
           let isEndBooked = false;
           let idx = 0;
           daysRequested = 0;
           while (d <= to) {
             const dayStr = d.toISOString().split('T')[0];
             if (d.getDay() !== 0 && !holidayDates.has(dayStr)) { // Not Sunday and not holiday
               if (leaveDatesSet.has(dayStr)) {
                 alreadyLeaveDays++;
                 if (idx === 0) isStartBooked = true;
                 // Check end after loop
               } else {
                 daysRequested++;
               }
             }
             d.setDate(d.getDate() + 1);
             idx++;
           }
           // Check end date
           const endDate = new Date(payload.to_date);
           const endDateStr = endDate.toISOString().split('T')[0];
           if (endDate.getDay() !== 0 && !holidayDates.has(endDateStr) && leaveDatesSet.has(endDateStr)) isEndBooked = true;
           if (isStartBooked || isEndBooked) {
             toast('❌ Start or end date is already booked', {
               description: 'The start or end date of your leave overlaps with an existing leave.',
               style: { background: '#ef4444', color: 'white' },
               duration: 4000,
             });
             throw new Error('Start or end date already booked.');
           }
         }
       } else if (leaveData && leaveData.category === 'multi-day' && leaveData.from_date && leaveData.to_date) {
         let d = new Date(leaveData.from_date);
         const to = new Date(leaveData.to_date);
         let isStartBooked = false;
         let isEndBooked = false;
         let idx = 0;
         daysRequested = 0;
         alreadyLeaveDays = 0;
         while (d <= to) {
           const dayStr = d.toISOString().split('T')[0];
           if (d.getDay() !== 0 && !holidayDates.has(dayStr)) { // Not Sunday and not holiday
             if (leaveDatesSet.has(dayStr)) {
               alreadyLeaveDays++;
               if (idx === 0) isStartBooked = true;
               // Check end after loop
             } else {
               daysRequested++;
             }
           }
           d.setDate(d.getDate() + 1);
           idx++;
         }
         // Check end date
         const endDate = new Date(leaveData.to_date);
         const endDateStr = endDate.toISOString().split('T')[0];
         if (endDate.getDay() !== 0 && !holidayDates.has(endDateStr) && leaveDatesSet.has(endDateStr)) isEndBooked = true;
         if (isStartBooked || isEndBooked) {
           toast('❌ Start or end date is already booked', {
             description: 'The start or end date of your leave overlaps with an existing leave.',
             style: { background: '#ef4444', color: 'white' },
             duration: 4000,
           });
           throw new Error('Start or end date already booked.');
         }
       } else {
         daysRequested = 1;
       }
       // For single-day, check overlap
       if (leaveData && leaveData.category !== 'multi-day' && leaveData.leave_date) {
         const dayStr = new Date(leaveData.leave_date).toISOString().split('T')[0];
         if (leaveDatesSet.has(dayStr)) {
           daysRequested = 0;
         }
       }
     }

    // 5. Get total allocated leaves
    let totalAllocated = 0;
    if (leaveType === 'sick') totalAllocated = balance.sick_leaves;
    else if (leaveType === 'casual') totalAllocated = balance.casual_leaves;
    else if (leaveType === 'paid') totalAllocated = balance.paid_leaves;

    // 6. Calculate available balance
    const available = totalAllocated - daysRequested;

    console.log('Leave balance check:', {
      leaveType,
      totalAllocated,
      daysRequested,
      available,
      userId
    });

    // 7. Check if enough balance
    if (daysRequested > available) {
      toast('❌ Insufficient Leave Balance', {
        description: `You only have ${available} ${leaveType} leave(s) available (${totalAllocated} total - ${daysRequested} used/pending), but you requested ${daysRequested}.`,
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      throw new Error('Insufficient leave balance.');
    }
    // Do NOT decrement here!
    return true;
  };

  const addLeave = async (leaveData: Omit<Leave, 'id' | 'created_at' | 'updated_at' | 'user'>) => {
    setError(null);
    
    if (!user?.id) {
      setError('No user found');
      return false;
    }

    // Block single-day leave on Sunday
    if (leaveData.category !== 'multi-day' && leaveData.leave_date && isSunday(leaveData.leave_date)) {
      toast('❌ Sundays are not selectable for leave', {
        description: 'You cannot apply for leave on a Sunday.',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      setError('Cannot apply for leave on a Sunday.');
      return false;
    }
    // Block multi-day leave if all days are Sundays
    if (leaveData.category === 'multi-day' && leaveData.from_date && leaveData.to_date && allSundays(leaveData.from_date, leaveData.to_date)) {
      toast('❌ Sundays are not selectable for leave', {
        description: 'You cannot apply for leave only on Sundays.',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      setError('Cannot apply for leave only on Sundays.');
      return false;
    }

    // Check leave balance before adding
    try {
      await checkLeaveBalance(user.id, leaveData.leave_type, undefined, undefined, leaveData);
    } catch (error) {
      setError(error.message);
      return false;
    }

    // Ensure from_date and to_date are null for single-day leaves
    const payload = {
      ...leaveData,
      leave_date: leaveData.category === 'multi-day' ? null : leaveData.leave_date,
      from_date: leaveData.from_date && leaveData.from_date !== '' ? leaveData.from_date : null,
      to_date: leaveData.to_date && leaveData.to_date !== '' ? leaveData.to_date : null,
      end_date: leaveData.end_date === '' ? null : leaveData.end_date,
    };
    delete payload.id; // Ensure id is not sent for insert
    console.log('Attempting to add leave with payload:', payload);
    const { data, error } = await supabase
      .from('leaves')
      .insert([payload])
      .select('*')
      .single();
    if (error) {
      setError(error.message || 'Error adding leave');
      console.error('Error adding leave:', error);
      return false;
    }
    if (data) {
      // Manually fetch user data for the new leave
      let userData = null;
      
      // Try to find user in members table first
      let { data: memberUser, error: memberError } = await supabase
        .from('members')
        .select('id, name, email')
        .eq('id', data.user_id)
        .maybeSingle();
      
      // If not found in members, try admins table
      if (!memberUser && !memberError) {
        let { data: adminUser, error: adminError } = await supabase
          .from('admins')
          .select('id, name, email')
          .eq('id', data.user_id)
          .maybeSingle();
        if (!adminError) {
          userData = adminUser;
        }
      } else {
        userData = memberUser;
      }
      
      // If not found in admins, try project managers table
      if (!userData) {
        let { data: pmUser, error: pmError } = await supabase
          .from('project_managers')
          .select('id, name, email')
          .eq('id', data.user_id)
          .maybeSingle();
        if (!pmError) {
          userData = pmUser;
        }
      }

      const newLeave = {
        ...data,
        user: userData
      };

      setLeaves(prev => [newLeave, ...prev]);
      // Send webhook to n8n automation for leave added (non-blocking)
      fetch('https://n8nautomation.site/webhook-test/onLeaveAdded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(webhookError => {
        console.error('Failed to send leave added webhook (onLeaveAdded):', webhookError);
      });
      
      fetch('https://n8nautomation.site/webhook-test/onleaveadded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          member_email: user?.email || '',
        }),
      }).catch(webhookError => {
        console.error('Failed to send leave added webhook (onleaveadded):', webhookError);
      });
      
      fetch('https://n8nautomation.site/webhook-test/taskaddedemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          member_email: user?.email || '',
          event: 'leave-added',
        }),
      }).catch(webhookError => {
        console.error('Failed to send leave added webhook (taskaddedemail):', webhookError);
      });

      // --- NEW: Notify all admins and the member (from/to logic) ---
      try {
        const { data: admins } = await supabase
          .from('admins')
          .select('id, name')
          .eq('is_active', true);
        // Notify all admins (to_id = admin, from_id = member)
        if (admins && admins.length > 0 && user?.id) {
          await Promise.all(admins.map((admin: any) =>
            supabase.from('notifications').insert([
              {
                user_id: admin.id,
                from_id: user.id,
                to_id: admin.id,
                title: '📝 Leave Request',
                                 message: `${user?.name || 'A member'} has requested leave: ${data.leave_type} (${data.category === 'multi-day' ? `${data.from_date} to ${data.to_date}` : (data.leave_date || data.from_date || 'No date')})`,
                type: 'leave_requested',
                related_id: data.id,
                related_type: 'leave',
                created_at: new Date().toISOString(),
                is_read: false,
              },
            ])
          ));
        }
        // Notify the member (self-notification)
        if (user?.id) {
          await supabase.from('notifications').insert([
            {
              user_id: user.id,
              from_id: user.id,
              to_id: user.id,
              title: '📝 You requested leave',
                             message: `You requested leave: ${data.leave_type} (${data.category === 'multi-day' ? `${data.from_date} to ${data.to_date}` : (data.leave_date || data.from_date || 'No date')})`,
              type: 'leave_requested',
              related_id: data.id,
              related_type: 'leave',
              created_at: new Date().toISOString(),
              is_read: false,
            },
          ]);
        }
        // Show toast notifications
        // @ts-ignore
        if (window && window.sonner) {
          window.sonner.toast('📝 Leave Requested', {
            description: `Your leave request has been submitted!`,
            style: { background: '#2563eb', color: 'white' },
            duration: 4500,
          });
        }
      } catch (notifError) {
        console.error('Failed to send notification to admin/member (member leave request):', notifError);
      }
      // --- END NEW ---
      return true;
    }
    setError('Unknown error adding leave');
    return false;
  };

  const updateLeave = async (id: string, updates: Partial<Leave>) => {
    if (!id) {
      console.error('No leave ID provided for update');
      throw new Error('Leave ID is required');
    }

    if (!user?.id) {
      throw new Error('No user found');
    }

    // Calculate days requested
    let daysRequested = 1;
    if (updates.category === 'multi-day' && updates.from_date && updates.to_date) {
      daysRequested = await countNonSundayAndNonHolidayDays(updates.from_date, updates.to_date);
    }

    // Block single-day leave on Sunday
    if (updates.category !== 'multi-day' && updates.leave_date && isSunday(updates.leave_date)) {
      toast('❌ Sundays are not selectable for leave', {
        description: 'You cannot apply for leave on a Sunday.',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      throw new Error('Cannot apply for leave on a Sunday.');
    }
    // Block multi-day leave if all days are Sundays
    if (updates.category === 'multi-day' && updates.from_date && updates.to_date && allSundays(updates.from_date, updates.to_date)) {
      toast('❌ Sundays are not selectable for leave', {
        description: 'You cannot apply for leave only on Sundays.',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      throw new Error('Cannot apply for leave only on Sundays.');
    }

    // Check if this is only a status update
    const isOnlyStatusUpdate = Object.keys(updates).length === 1 && updates.hasOwnProperty('status');
    
    // Check leave balance before updating
    // Only check if the user is the leave owner and not just updating status
    // For admin approval, skip this check as the balance will be deducted by the database trigger
    if (updates.leave_type && !isOnlyStatusUpdate && user?.id === updates.user_id) {
      try {
        await checkLeaveBalance(user.id, updates.leave_type, daysRequested, id, updates, updates);
      } catch (error) {
        throw error;
      }
    }
    
    // Ensure dates are properly formatted (only if not just status update)
    const payload = isOnlyStatusUpdate ? {
      ...updates,
      updated_at: new Date().toISOString(),
    } : {
      ...updates,
      leave_date: updates.category === 'multi-day' ? null : updates.leave_date,
      from_date: updates.from_date && updates.from_date !== '' ? updates.from_date : null,
      to_date: updates.to_date && updates.to_date !== '' ? updates.to_date : null,
      end_date: updates.end_date === '' ? null : updates.end_date,
      updated_at: new Date().toISOString(),
    };

    console.log('Updating leave with payload:', { id, payload, isOnlyStatusUpdate });

    // Check for date conflicts before updating (only if not just status update)
    // Skip for admin approval as they're just changing status
    let conflict = false;
    if (user?.id && !isOnlyStatusUpdate && user?.id === updates.user_id) {
      if (payload.category === 'multi-day') {
        // Check for overlap with any other leave (not rejected, not this leave)
        const { data: otherLeaves, error: fetchError } = await supabase
          .from('leaves')
          .select('id, from_date, to_date, status, category')
          .eq('user_id', user.id)
          .not('id', 'eq', id)
          .not('status', 'eq', 'rejected');
        if (!fetchError && otherLeaves) {
          const newFrom = new Date(payload.from_date);
          const newTo = new Date(payload.to_date);
          for (const l of otherLeaves) {
            if (l.category === 'multi-day' && l.from_date && l.to_date) {
              const lFrom = new Date(l.from_date);
              const lTo = new Date(l.to_date);
              if (newFrom <= lTo && newTo >= lFrom) {
                conflict = true;
                break;
              }
            } else if (l.category !== 'multi-day' && l.from_date) {
              // Single day leave in DB, check if it falls in new range
              const lDate = new Date(l.from_date);
              if (lDate >= newFrom && lDate <= newTo) {
                conflict = true;
                break;
              }
            }
          }
        }
      } else {
        // Single day: check if any other leave (not rejected, not this leave) has same leave_date
        const { data: otherLeaves, error: fetchError } = await supabase
          .from('leaves')
          .select('id, leave_date, status, category')
          .eq('user_id', user.id)
          .not('id', 'eq', id)
          .not('status', 'eq', 'rejected');
        if (!fetchError && otherLeaves) {
          for (const l of otherLeaves) {
            if (l.category === 'multi-day' && l.from_date && l.to_date) {
              // Check if new leave_date falls in any multi-day leave
              const lFrom = new Date(l.from_date);
              const lTo = new Date(l.to_date);
              const newDate = new Date(payload.leave_date);
              if (newDate >= lFrom && newDate <= lTo) {
                conflict = true;
                break;
              }
            } else if (l.leave_date === payload.leave_date) {
              conflict = true;
              break;
            }
          }
        }
      }
    }
    if (conflict) {
      toast('❌ Date Already Booked', {
        description: 'The selected date(s) are already booked for another leave request.',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      throw new Error('Date already booked for another leave.');
    }

    // Check leave balance before updating (only if not just status update and user is the leave owner)
    // Skip leave balance check for admin status updates (approval/rejection)
    if (user?.id && payload.leave_type && !isOnlyStatusUpdate && user?.id === updates.user_id && user?.role !== 'admin') {
      // Fetch leave balance for this user and year (supports both members and project managers)
      const currentYear = new Date().getFullYear();
      
      // First try to find balance for member
      let { data: balances, error: balanceError } = await supabase
        .from('member_leave_balances')
        .select('*')
        .eq('member_id', updates.user_id)
        .eq('year', currentYear)
        .single();

      // If not found as member, try as admin
      if (balanceError || !balances) {
        const { data: adminBalances, error: adminBalanceError } = await supabase
          .from('member_leave_balances')
          .select('*')
          .eq('admin_id', updates.user_id)
          .eq('year', currentYear)
          .single();
        
        balances = adminBalances;
        balanceError = adminBalanceError;
      }

      // If not found as admin, try as project manager in member_leave_balances
      if (balanceError || !balances) {
        const { data: pmBalances, error: pmBalanceError } = await supabase
          .from('member_leave_balances')
          .select('*')
          .eq('project_manager_id', updates.user_id)
          .eq('year', currentYear)
          .single();
        
        balances = pmBalances;
        balanceError = pmBalanceError;
      }

      // If not found in member_leave_balances, try project_manager_leave_balances
      if (balanceError || !balances) {
        const { data: pmBalances, error: pmBalanceError } = await supabase
          .from('project_manager_leave_balances')
          .select('sick_leave, casual_leave, earned_leave')
          .eq('project_manager_id', updates.user_id)
          .eq('year', currentYear)
          .single();
        
        if (!pmBalanceError && pmBalances) {
          // Map the project manager leave balance fields to the expected format
          balances = {
            sick_leaves: pmBalances.sick_leave,
            casual_leaves: pmBalances.casual_leave,
            paid_leaves: pmBalances.earned_leave,
          };
          balanceError = null;
        } else {
          balances = pmBalances;
          balanceError = pmBalanceError;
        }
      }

      if (!balanceError && balances) {
        // Calculate days requested in this update
        let daysRequested = 1;
        if (payload.category === 'multi-day' && payload.from_date && payload.to_date) {
          const from = new Date(payload.from_date);
          const to = new Date(payload.to_date);
          daysRequested = await countNonSundayAndNonHolidayDays(payload.from_date, payload.to_date);
        }

        // Get all existing leaves of this type (approved or pending, excluding the current one being edited)
        const { data: existingLeaves, error: leavesError } = await supabase
          .from('leaves')
          .select('*')
          .eq('user_id', updates.user_id)
          .eq('leave_type', payload.leave_type)
          .in('status', ['approved', 'pending'])
          .not('id', 'eq', id); // Exclude the current leave being edited

        let daysUsed = 0;
        if (!leavesError && existingLeaves) {
          // Calculate total days used/pending
          for (const leave of existingLeaves) {
            if (leave.category === 'multi-day' && leave.from_date && leave.to_date) {
              const from = new Date(leave.from_date);
              const to = new Date(leave.to_date);
              daysUsed += await countNonSundayAndNonHolidayDays(leave.from_date, leave.to_date);
            } else {
              daysUsed += 1; // Single day leave
            }
          }
        }

        // Get total allocated leaves for this type
        let totalAllocated = 0;
        if (payload.leave_type === 'sick') totalAllocated = balances.sick_leaves;
        else if (payload.leave_type === 'casual') totalAllocated = balances.casual_leaves;
        else if (payload.leave_type === 'paid') totalAllocated = balances.paid_leaves;

        // Calculate available balance
        const available = totalAllocated - daysUsed;

        console.log('Leave balance check:', {
          leaveType: payload.leave_type,
          totalAllocated,
          daysUsed,
          available,
          daysRequested
        });

        if (daysRequested > available) {
          toast('❌ Insufficient Leave Balance', {
            description: `You only have ${available} ${payload.leave_type} leave(s) available (${totalAllocated} total - ${daysUsed} used/pending), but you requested ${daysRequested}.`,
            style: { background: '#ef4444', color: 'white' },
            duration: 4000,
          });
          throw new Error('Insufficient leave balance.');
        }
      }
    }

    const { data, error } = await supabase
      .from('leaves')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating leave:', error);
      
      // Handle the specific case where the database trigger fails due to missing leave balance
      if (error.message && error.message.includes('No leave balance found for user')) {
        // This is likely an admin trying to approve a leave, but the trigger is looking for admin's balance
        // instead of the leave owner's balance. Let's try to handle this manually.
        
        // First, let's get the leave details to see who owns it
        const { data: leaveDetails, error: leaveError } = await supabase
          .from('leaves')
          .select('*')
          .eq('id', id)
          .single();
          
        if (!leaveError && leaveDetails) {
          // Check if this is an admin approval and the leave owner has a balance
          const currentYear = new Date().getFullYear();
          
          // Try to find the leave owner's balance
          let { data: ownerBalance, error: balanceError } = await supabase
            .from('member_leave_balances')
            .select('*')
            .eq('member_id', leaveDetails.user_id)
            .eq('year', currentYear)
            .single();

          // If not found as member, try as admin
          if (balanceError || !ownerBalance) {
            const { data: adminBalance, error: adminBalanceError } = await supabase
              .from('member_leave_balances')
              .select('*')
              .eq('admin_id', leaveDetails.user_id)
              .eq('year', currentYear)
              .single();
            
            ownerBalance = adminBalance;
            balanceError = adminBalanceError;
          }

          // If not found as admin, try as project manager in member_leave_balances
          if (balanceError || !ownerBalance) {
            const { data: pmBalance, error: pmBalanceError } = await supabase
              .from('member_leave_balances')
              .select('*')
              .eq('project_manager_id', leaveDetails.user_id)
              .eq('year', currentYear)
              .single();
            
            ownerBalance = pmBalance;
            balanceError = pmBalanceError;
          }

          // If not found in member_leave_balances, try project_manager_leave_balances
          if (balanceError || !ownerBalance) {
            const { data: pmBalance, error: pmBalanceError } = await supabase
              .from('project_manager_leave_balances')
              .select('sick_leave, casual_leave, earned_leave')
              .eq('project_manager_id', leaveDetails.user_id)
              .eq('year', currentYear)
              .single();
            
            if (!pmBalanceError && pmBalance) {
              ownerBalance = {
                sick_leaves: pmBalance.sick_leave,
                casual_leaves: pmBalance.casual_leave,
                paid_leaves: pmBalance.earned_leave,
              };
              balanceError = null;
            } else {
              ownerBalance = pmBalance;
              balanceError = pmBalanceError;
            }
          }

          if (ownerBalance) {
            // The leave owner has a balance, so the issue is with the trigger
            // Let's try to update the leave again, but this time we'll handle the balance deduction manually
            console.log('Leave owner has balance, attempting manual update...');
            
            // Try the update again
            const { data: retryData, error: retryError } = await supabase
              .from('leaves')
              .update(payload)
              .eq('id', id)
              .select('*')
              .single();

            if (!retryError && retryData) {
              // Success! The trigger might have worked this time or we got lucky
              return retryData;
            }
          }
        }
      }
      
      throw new Error(error.message || 'Failed to update leave');
    }

    if (!data) {
      console.error('No leave found with ID:', id);
      throw new Error('Leave not found');
    }

    // Manually fetch user data
    let userData = null;
    
    // Try to find user in members table first
    let { data: memberUser, error: memberError } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('id', data.user_id)
      .maybeSingle();
    
    // If not found in members, try admins table
    if (!memberUser && !memberError) {
      let { data: adminUser, error: adminError } = await supabase
        .from('admins')
        .select('id, name, email')
        .eq('id', data.user_id)
        .maybeSingle();
      if (!adminError) {
        userData = adminUser;
      }
    } else {
      userData = memberUser;
    }
    
    // If not found in admins, try project managers table
    if (!userData) {
      let { data: pmUser, error: pmError } = await supabase
        .from('project_managers')
        .select('id, name, email')
        .eq('id', data.user_id)
        .maybeSingle();
      if (!pmError) {
        userData = pmUser;
      }
    }

    const updatedLeave = {
      ...data,
      user: userData
    };

    // Update local state
    setLeaves(prev => prev.map(leave => (leave.id === id ? updatedLeave : leave)));

    // Send webhook to n8n automation for leave updated (non-blocking)
    fetch('https://n8nautomation.site/webhook-test/taskaddedemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        member_email: user?.email || '',
        event: 'leave-updated',
      }),
    }).catch(webhookError => {
      console.error('Failed to send leave updated webhook:', webhookError);
    });

    // Show success toast
    toast('✅ Leave Updated', {
      description: `Your leave request has been updated successfully.`,
      style: { background: '#10b981', color: 'white' },
      duration: 4000,
    });

    return updatedLeave;
  };

  const deleteLeave = async (id: string) => {
    const { error } = await supabase.from('leaves').delete().eq('id', id);
    if (error) {
      console.error('Error deleting leave:', error);
    }
    setLeaves(prev => prev.filter(leave => leave.id !== id));
  };

  const filterLeaves = (filters: LeaveFilters) => {
    return leaves.filter(leave => {
      if (filters.member && leave.user_id !== filters.member) return false;
      if (filters.leave_type && leave.leave_type !== filters.leave_type) return false;
      if (filters.month || filters.year) {
        const leaveDate = new Date(leave.leave_date);
        if (filters.month && leaveDate.getMonth() + 1 !== filters.month) return false;
        if (filters.year && leaveDate.getFullYear() !== filters.year) return false;
      }
      return true;
    });
  };

  return {
    leaves,
    loading,
    error,
    addLeave,
    updateLeave,
    deleteLeave,
    filterLeaves,
    setLeaves, // <-- Export setLeaves
  };
};