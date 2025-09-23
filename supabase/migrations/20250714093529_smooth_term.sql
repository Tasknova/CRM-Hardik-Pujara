/*
  # Insert sample data for testing and development

  1. Sample Data
    - Create sample admin and member users
    - Create sample tasks with different statuses
    - Create sample leave requests
    - Create sample notifications

  2. Notes
    - Passwords are hashed versions of simple passwords for testing
    - This data should only be used in development environments
    - Real production data should be created through the application
*/

-- Insert sample users
INSERT INTO users (id, email, name, role, password_hash, department, hire_date, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', 'Admin User', 'admin', '$2b$10$rOzJqZxQQWKaK8ZQHnKtUeYvVQVQVQVQVQVQVQVQVQVQVQVQVQVQ', 'Management', '2023-01-15', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'john.doe@company.com', 'John Doe', 'member', '$2b$10$rOzJqZxQQWKaK8ZQHnKtUeYvVQVQVQVQVQVQVQVQVQVQVQVQVQVQ', 'Development', '2023-03-20', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'jane.smith@company.com', 'Jane Smith', 'member', '$2b$10$rOzJqZxQQWKaK8ZQHnKtUeYvVQVQVQVQVQVQVQVQVQVQVQVQVQVQ', 'Design', '2023-02-10', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'mike.wilson@company.com', 'Mike Wilson', 'member', '$2b$10$rOzJqZxQQWKaK8ZQHnKtUeYvVQVQVQVQVQVQVQVQVQVQVQVQVQVQ', 'Marketing', '2023-04-05', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'sarah.johnson@company.com', 'Sarah Johnson', 'member', '$2b$10$rOzJqZxQQWKaK8ZQHnKtUeYvVQVQVQVQVQVQVQVQVQVQVQVQVQVQ', 'Development', '2023-05-12', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (id, user_id, created_by, task_name, description, due_date, priority, status, estimated_hours) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Complete project proposal', 'Draft the Q1 project proposal for client review', '2025-01-15', 'high', 'pending', 8),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Review team performance', 'Conduct monthly team performance review', '2025-01-20', 'medium', 'completed', 4),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Fix database issues', 'Resolve performance issues in the user database', '2025-01-12', 'urgent', 'blocked', 12),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Update marketing materials', 'Refresh company brochures and website content', '2025-01-25', 'medium', 'in_progress', 6),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Code review session', 'Review pull requests and provide feedback', '2025-01-18', 'low', 'pending', 3),
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Design new user interface', 'Create mockups for the new dashboard design', '2025-01-30', 'high', 'in_progress', 16)
ON CONFLICT (id) DO NOTHING;

-- Insert sample leaves
INSERT INTO leaves (id, user_id, leave_date, end_date, leave_type, status, reason, is_half_day) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '2025-01-25', NULL, 'casual', 'approved', 'Family vacation', false),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '2025-02-14', NULL, 'sick', 'pending', 'Medical appointment', true),
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '2025-02-20', '2025-02-22', 'vacation', 'approved', 'Long weekend trip', false),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', '2025-01-28', NULL, 'casual', 'pending', 'Personal matters', false),
  ('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '2025-03-05', '2025-03-07', 'paid', 'approved', 'Conference attendance', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample task comments
INSERT INTO task_comments (id, task_id, user_id, comment, is_internal) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Started working on the initial draft. Will have it ready by tomorrow.', false),
  ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Great! Please make sure to include the budget breakdown section.', false),
  ('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Database server is experiencing high load. Need additional resources.', true),
  ('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'Initial wireframes are complete. Moving to high-fidelity designs.', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample notifications
INSERT INTO notifications (id, user_id, title, message, type, related_id, related_type) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Task Due Tomorrow', 'Your task "Complete project proposal" is due tomorrow', 'task_due', '660e8400-e29b-41d4-a716-446655440001', 'task'),
  ('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Leave Request Pending', 'Your leave request for Feb 14 is pending approval', 'system', '770e8400-e29b-41d4-a716-446655440002', 'leave'),
  ('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'Leave Approved', 'Your vacation leave for Feb 20-22 has been approved', 'leave_approved', '770e8400-e29b-41d4-a716-446655440003', 'leave'),
  ('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'New Task Assigned', 'You have been assigned a new task: "Code review session"', 'task_assigned', '660e8400-e29b-41d4-a716-446655440005', 'task')
ON CONFLICT (id) DO NOTHING;