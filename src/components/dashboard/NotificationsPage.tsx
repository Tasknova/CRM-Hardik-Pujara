import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const NotificationsPage: React.FC<{ setFilteredNotificationsCount?: (count: number) => void }> = ({ setFilteredNotificationsCount }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const notificationsChannelRef = useRef<any>(null);

  // Helper to get/set dismissed notifications in localStorage
  const getDismissedNotifications = () => {
    if (!user?.id) return [];
    try {
      return JSON.parse(localStorage.getItem(`dismissedNotifications_${user.id}`) || '[]');
    } catch {
      return [];
    }
  };
  const addDismissedNotification = (notifId: string) => {
    if (!user?.id) return;
    const dismissed = getDismissedNotifications();
    if (!dismissed.includes(notifId)) {
      localStorage.setItem(
        `dismissedNotifications_${user.id}`,
        JSON.stringify([...dismissed, notifId])
      );
    }
  };

  // Fetch notifications and filter out dismissed
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setNotifications([]);
      setFilteredNotificationsCount && setFilteredNotificationsCount(0);
    } else {
      const dismissed = getDismissedNotifications();
      const filtered = (data || []).filter(n => !dismissed.includes(n.id));
      setNotifications(filtered);
      setFilteredNotificationsCount && setFilteredNotificationsCount(filtered.length);
    }
    setLoading(false);
  };

  // On mount and when user changes, fetch and filter
  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Real-time subscription for new notifications and deletes
  useEffect(() => {
    if (!user) return;
    if (notificationsChannelRef.current) {
      supabase.removeChannel(notificationsChannelRef.current);
    }
    const channel = supabase.channel('notifications-realtime-ui')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Only add new notification if not dismissed
          if (payload.eventType === 'INSERT' && payload.new) {
            const dismissed = getDismissedNotifications();
            if (!dismissed.includes(payload.new.id)) {
              setNotifications(prev => {
                const updated = [payload.new, ...prev];
                setFilteredNotificationsCount && setFilteredNotificationsCount(updated.length);
                return updated;
              });
            }
          } else {
            // For UPDATE/DELETE, re-fetch and filter
            fetchNotifications();
          }
        }
      )
      .subscribe();
    notificationsChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDelete = async (id: string) => {
    // Remove from UI immediately
    addDismissedNotification(id);
    setNotifications(notifications => {
      const updated = notifications.filter(n => n.id !== id);
      setFilteredNotificationsCount && setFilteredNotificationsCount(updated.length);
      return updated;
    });
    // Attempt to delete from Supabase (fail silently)
    await supabase.from('notifications').delete().eq('id', id);
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (error) {
      console.error('Delete all notifications error:', error);
      alert('Failed to delete all notifications: ' + error.message);
      return;
    }
    setNotifications([]);
    setFilteredNotificationsCount && setFilteredNotificationsCount(0);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      {loading ? (
        <div className="text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-gray-500">No notifications.</div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="danger" onClick={handleDeleteAll}>Delete all</Button>
          </div>
          <div className="space-y-4">
            {notifications.map(n => (
              <Card key={n.id + '-' + n.created_at} className="flex items-center justify-between p-4 border border-gray-200 bg-white">
                <div>
                  <div className="font-semibold text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => handleDelete(n.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsPage; 