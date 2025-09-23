import { supabase } from '../lib/supabase';

export async function sendNotification({ from_id, to_id, senderMsg, receiverMsg, type, related_id, related_type }) {
  // Insert notification for sender
  await supabase.from('notifications').insert({
    from_id,
    to_id,
    message: senderMsg,
    type,
    related_id,
    related_type,
    is_read: false,
  });
  // Insert notification for receiver
  await supabase.from('notifications').insert({
    from_id,
    to_id,
    message: receiverMsg,
    type,
    related_id,
    related_type,
    is_read: false,
  });
}
