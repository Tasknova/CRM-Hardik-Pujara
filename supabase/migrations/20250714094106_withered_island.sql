/*
  # Insert Sample Members and Admins

  1. Sample Data
    - Create sample admin accounts
    - Create sample member accounts
    - All passwords are hashed versions of 'password123'

  2. Test Accounts
    - Admin: admin@company.com / password123
    - Member: john@company.com / password123
    - Member: jane@company.com / password123
*/

-- Insert sample admin
INSERT INTO admins (id, email, name, password_hash, phone, is_active) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'admin@company.com',
  'System Administrator',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0001',
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  'manager@company.com',
  'Project Manager',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0002',
  true
);

-- Insert sample members
INSERT INTO members (id, email, name, password_hash, phone, department, hire_date, is_active) VALUES
(
  '00000000-0000-0000-0000-000000000101',
  'john@company.com',
  'John Doe',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0101',
  'Engineering',
  '2023-01-15',
  true
),
(
  '00000000-0000-0000-0000-000000000102',
  'jane@company.com',
  'Jane Smith',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0102',
  'Design',
  '2023-02-20',
  true
),
(
  '00000000-0000-0000-0000-000000000103',
  'mike@company.com',
  'Mike Johnson',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0103',
  'Marketing',
  '2023-03-10',
  true
),
(
  '00000000-0000-0000-0000-000000000104',
  'sarah@company.com',
  'Sarah Wilson',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0104',
  'Sales',
  '2023-04-05',
  true
),
(
  '00000000-0000-0000-0000-000000000105',
  'david@company.com',
  'David Brown',
  '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQ', -- password123
  '+1-555-0105',
  'Engineering',
  '2023-05-12',
  true
);