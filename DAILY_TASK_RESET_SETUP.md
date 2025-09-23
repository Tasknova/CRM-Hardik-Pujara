# Daily Task Reset Setup Guide

## Overview
This system automatically resets daily tasks every day at 11 AM IST (except Sundays). All completed and skipped tasks are reset to 'pending' status, allowing team members to work on them again the next day.

## Database Functions Created

### 1. `reset_daily_tasks()`
- **Purpose**: Main function that resets daily tasks
- **Logic**: 
  - Checks if it's Sunday (skips reset on Sundays)
  - Checks if it's 11 AM IST
  - Resets all completed/skipped tasks to pending
  - Logs the operation in audit_logs

### 2. `cron_reset_daily_tasks()`
- **Purpose**: Wrapper function for cron job calls
- **Logic**: Calls the main reset function and logs cron execution

### 3. `test_reset_daily_tasks()`
- **Purpose**: Manual testing function (ignores time/day restrictions)
- **Logic**: Resets tasks for current date regardless of time/day

### 4. `http_daily_task_reset_with_validation()`
- **Purpose**: HTTP endpoint function with comprehensive validation
- **Logic**: 
  - Validates day and time
  - Provides detailed response with task counts
  - Logs all operations

## Setup Instructions

### Option 1: Using External Cron Service (Recommended)

#### 1. Set up a cron job with an external service:

**Using cron-job.org:**
1. Go to https://cron-job.org
2. Create a new account
3. Add a new cron job with these settings:
   - **URL**: `https://mmadclhbsuvkcbibxcsp.supabase.co/rest/v1/rpc/http_daily_task_reset_with_validation`
   - **Method**: POST
   - **Headers**: 
     - `Content-Type: application/json`
     - `apikey: YOUR_SUPABASE_ANON_KEY`
   - **Schedule**: `0 11 * * 1-6` (Every day at 11 AM, Monday to Saturday)
   - **Timezone**: Asia/Kolkata

**Using GitHub Actions:**
Create `.github/workflows/daily-task-reset.yml`:
```yaml
name: Daily Task Reset
on:
  schedule:
    - cron: '0 11 * * 1-6'  # Every day at 11 AM IST, Monday to Saturday
  workflow_dispatch:  # Allow manual trigger

jobs:
  reset-daily-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Reset Daily Tasks
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://mmadclhbsuvkcbibxcsp.supabase.co/rest/v1/rpc/http_daily_task_reset_with_validation
```

**Using Vercel Cron:**
Create `api/cron/daily-task-reset.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch(
      'https://mmadclhbsuvkcbibxcsp.supabase.co/rest/v1/rpc/http_daily_task_reset_with_validation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY!,
        },
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset daily tasks' });
  }
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-task-reset",
      "schedule": "0 11 * * 1-6"
    }
  ]
}
```

### Option 2: Manual Testing

#### Test the reset functionality:
1. Go to Admin Dashboard → Daily Tasks
2. Click the "Reset Daily Tasks" button
3. Check the console for results
4. Verify that completed/skipped tasks are reset to pending

#### Test via SQL:
```sql
-- Test the reset function
SELECT * FROM http_daily_task_reset_with_validation();

-- Check audit logs
SELECT * FROM audit_logs WHERE action LIKE '%DAILY_TASK%' ORDER BY created_at DESC LIMIT 5;
```

## How It Works

### Daily Reset Process:
1. **Time Check**: Function runs at 11 AM IST
2. **Day Check**: Skips Sundays (day 0)
3. **Task Reset**: All completed/skipped tasks for today are reset to 'pending'
4. **Logging**: All operations are logged in audit_logs table
5. **Response**: Returns detailed information about the reset operation

### Task Status Flow:
```
Pending → Completed/Skipped → (Next Day 11 AM) → Pending
```

### Audit Trail:
All reset operations are logged with:
- Action type
- Date and time
- Number of tasks reset
- Before/after status counts
- IST time and day of week

## Monitoring

### Check Reset Status:
```sql
-- View recent reset operations
SELECT 
  action,
  old_values,
  new_values,
  created_at
FROM audit_logs 
WHERE action LIKE '%DAILY_TASK%' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Task Status:
```sql
-- View today's task status
SELECT 
  status,
  COUNT(*) as count
FROM daily_tasks 
WHERE task_date = CURRENT_DATE 
GROUP BY status;
```

## Troubleshooting

### Common Issues:

1. **Reset not working**:
   - Check if it's Sunday (function skips Sundays)
   - Check if it's 11 AM IST
   - Verify cron job is running

2. **Tasks not resetting**:
   - Check if tasks have 'completed' or 'skipped' status
   - Verify task_date is today

3. **Cron job failing**:
   - Check Supabase API key
   - Verify endpoint URL
   - Check network connectivity

### Manual Override:
If automatic reset fails, use the manual reset button in the admin dashboard or run:
```sql
SELECT * FROM test_reset_daily_tasks();
```

## Security Notes

- Functions use `SECURITY DEFINER` for admin privileges
- All operations are logged in audit_logs
- HTTP endpoint validates time and day before resetting
- Only admins can access the manual reset button

## Future Enhancements

1. **Email Notifications**: Send notifications when reset occurs
2. **Custom Schedules**: Allow different reset times for different teams
3. **Selective Reset**: Reset only specific task types or users
4. **Backup**: Create backup of task status before reset
5. **Analytics**: Track reset patterns and task completion rates
