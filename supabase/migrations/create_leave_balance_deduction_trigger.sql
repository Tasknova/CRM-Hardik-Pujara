-- Create function to deduct leave balance when leave is approved
CREATE OR REPLACE FUNCTION deduct_leave_balance_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  days_to_deduct integer := 1;
  user_balance record;
  balance_table text := 'member_leave_balances';
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  date_diff integer;
  check_date date;
  is_holiday boolean;
BEGIN
  -- Only proceed if status changed from pending to approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- Calculate days to deduct
    IF NEW.category = 'multi-day' AND NEW.from_date IS NOT NULL AND NEW.to_date IS NOT NULL THEN
      -- Count non-Sunday and non-holiday days in the range
      days_to_deduct := 0;
      date_diff := (NEW.to_date::date - NEW.from_date::date);
      FOR i IN 0..date_diff LOOP
        check_date := NEW.from_date::date + i;
        
        -- Check if it's Sunday
        IF EXTRACT(DOW FROM check_date) != 0 THEN -- Not Sunday (0 = Sunday)
          -- Check if it's a company holiday
          SELECT EXISTS(
            SELECT 1 FROM company_holidays 
            WHERE date = check_date 
            AND year = current_year
          ) INTO is_holiday;
          
          -- Only count if it's not a holiday
          IF NOT is_holiday THEN
            days_to_deduct := days_to_deduct + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    -- Find the user's leave balance (check all user types)
    SELECT * INTO user_balance 
    FROM member_leave_balances 
    WHERE (member_id = NEW.user_id OR admin_id = NEW.user_id OR project_manager_id = NEW.user_id)
    AND year = current_year
    LIMIT 1;
    
    -- If not found in member_leave_balances, check project_manager_leave_balances
    IF user_balance IS NULL THEN
      SELECT * INTO user_balance 
      FROM project_manager_leave_balances 
      WHERE project_manager_id = NEW.user_id
      AND year = current_year
      LIMIT 1;
      
      IF user_balance IS NOT NULL THEN
        balance_table := 'project_manager_leave_balances';
      END IF;
    END IF;
    
    IF user_balance IS NULL THEN
      RAISE EXCEPTION 'No leave balance found for user %', NEW.user_id;
    END IF;
    
    -- Deduct the appropriate leave type
    CASE NEW.leave_type
      WHEN 'sick' THEN
        IF balance_table = 'member_leave_balances' THEN
          IF user_balance.sick_leaves < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient sick leave balance. Available: %, Required: %', user_balance.sick_leaves, days_to_deduct;
          END IF;
          UPDATE member_leave_balances 
          SET sick_leaves = sick_leaves - days_to_deduct
          WHERE id = user_balance.id;
        ELSE
          IF user_balance.sick_leave < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient sick leave balance. Available: %, Required: %', user_balance.sick_leave, days_to_deduct;
          END IF;
          UPDATE project_manager_leave_balances 
          SET sick_leave = sick_leave - days_to_deduct
          WHERE id = user_balance.id;
        END IF;
      WHEN 'casual' THEN
        IF balance_table = 'member_leave_balances' THEN
          IF user_balance.casual_leaves < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient casual leave balance. Available: %, Required: %', user_balance.casual_leaves, days_to_deduct;
          END IF;
          UPDATE member_leave_balances 
          SET casual_leaves = casual_leaves - days_to_deduct
          WHERE id = user_balance.id;
        ELSE
          IF user_balance.casual_leave < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient casual leave balance. Available: %, Required: %', user_balance.casual_leave, days_to_deduct;
          END IF;
          UPDATE project_manager_leave_balances 
          SET casual_leave = casual_leave - days_to_deduct
          WHERE id = user_balance.id;
        END IF;
      WHEN 'paid' THEN
        IF balance_table = 'member_leave_balances' THEN
          IF user_balance.paid_leaves < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient paid leave balance. Available: %, Required: %', user_balance.paid_leaves, days_to_deduct;
          END IF;
          UPDATE member_leave_balances 
          SET paid_leaves = paid_leaves - days_to_deduct
          WHERE id = user_balance.id;
        ELSE
          IF user_balance.earned_leave < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient paid leave balance. Available: %, Required: %', user_balance.earned_leave, days_to_deduct;
          END IF;
          UPDATE project_manager_leave_balances 
          SET earned_leave = earned_leave - days_to_deduct
          WHERE id = user_balance.id;
        END IF;
      ELSE
        RAISE EXCEPTION 'Invalid leave type: %', NEW.leave_type;
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when leave status is updated
DROP TRIGGER IF EXISTS deduct_leave_balance_trigger ON leaves;
CREATE TRIGGER deduct_leave_balance_trigger
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION deduct_leave_balance_on_approval();
