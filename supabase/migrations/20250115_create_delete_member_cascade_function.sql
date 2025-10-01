-- Create function to delete member with cascade
CREATE OR REPLACE FUNCTION delete_member_with_cascade(target_member_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    deleted_count INTEGER := 0;
BEGIN
    -- Start transaction
    BEGIN
        -- 1. Delete stage assignments first
        DELETE FROM rental_stage_assignments WHERE member_id = target_member_id;
        DELETE FROM builder_stage_assignments WHERE member_id = target_member_id;
        
        -- 2. Delete team member assignments
        DELETE FROM rental_deal_team_members WHERE member_id = target_member_id;
        DELETE FROM builder_deal_team_members WHERE member_id = target_member_id;
        
        -- 3. Delete stage assignments where member is assigned_to
        DELETE FROM rental_deal_stages WHERE assigned_to = target_member_id;
        
        -- 4. Update tasks to remove member from assigned_user_ids
        UPDATE tasks 
        SET assigned_user_ids = array_remove(assigned_user_ids, target_member_id::text)
        WHERE target_member_id::text = ANY(assigned_user_ids);
        
        -- 5. Delete tasks where member is primary assignee
        DELETE FROM tasks WHERE user_id = target_member_id;
        
        -- 6. Delete leave balances
        DELETE FROM member_leave_balances WHERE member_id = target_member_id;
        DELETE FROM project_manager_leave_balances WHERE project_manager_id = target_member_id;
        
        -- 7. Delete leaves
        DELETE FROM leaves WHERE user_id = target_member_id;
        
        -- 8. Delete notifications
        DELETE FROM notifications WHERE user_id = target_member_id;
        
        -- 9. Delete daily tasks
        DELETE FROM daily_tasks WHERE user_id = target_member_id;
        
        -- 10. Delete project manager assignments
        DELETE FROM project_manager_assignments WHERE project_manager_id = target_member_id;
        
        -- 11. Finally delete the member
        DELETE FROM members WHERE id = target_member_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Return success result
        result := json_build_object(
            'success', true,
            'message', 'Member deleted successfully',
            'deleted_count', deleted_count
        );
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Return error result
            result := json_build_object(
                'success', false,
                'message', SQLERRM,
                'deleted_count', deleted_count
            );
            RETURN result;
    END;
END;
$$;
