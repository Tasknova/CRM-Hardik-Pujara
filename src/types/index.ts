export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectManager {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type User = Member | Admin | ProjectManager;

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  start_date?: string;
  expected_end_date?: string;
  status?: 'active' | 'completed' | 'on_hold' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'url' | 'file';
  file_type?: string;
  size?: number;
  uploaded_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  created_by: string;
  task_name: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'not_started' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  user?: Member;
  project_id?: string;
  project?: Project;
  progress: number; // 0-100
  attachments?: TaskAttachment[];
}

export interface Leave {
  id: string;
  user_id: string;
  leave_date: string | null;
  end_date?: string | null;
  leave_type: 'sick' | 'casual' | 'paid' | 'maternity' | 'paternity' | 'emergency' | 'vacation';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  is_half_day?: boolean;
  created_at: string;
  updated_at: string;
  user?: Member;
  category?: 'single-day' | 'multi-day';
  from_date?: string | null;
  to_date?: string | null;
  brief_description?: string | null;
}

export interface AuthContextType {
  user: (Member & { role: 'member' }) | (Admin & { role: 'admin' }) | (ProjectManager & { role: 'project_manager' }) | null;
  login: (email: string, password: string, role: 'admin' | 'member' | 'project_manager') => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: (user: (Member & { role: 'member' }) | (Admin & { role: 'admin' }) | (ProjectManager & { role: 'project_manager' }) | null) => void;
}

export interface TaskFilters {
  status?: 'not_started' | 'in_progress' | 'completed' | 'pending';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  member?: string;
  dueDateSort?: 'asc' | 'desc';
  search?: string;
  assignedTo?: string;
  project?: string;
  userId?: string;
}

export interface LeaveFilters {
  member?: string;
  leave_type?: 'sick' | 'casual' | 'paid';
  month?: number;
  year?: number;
}

export interface DailyTask {
  id: string;
  user_id: string;
  created_by: string;
  task_name: string;
  description?: string;
  status: 'pending' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  attachments?: any[];
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  task_date: string;
  project_id?: string;
  project?: Project;
  user?: Member;
  created_by_user?: Member | null;
}

export interface DailyTaskFilters {
  status?: 'pending' | 'completed' | 'skipped';
  member?: string;
  date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
  project?: string;
}

export interface DeletedTask {
  id: string;
  original_task_id: string;
  task_name: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  progress?: number;
  user_id: string;
  created_by: string;
  deleted_by: string;
  project_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  attachments?: any[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  task_type: 'regular' | 'daily';
  task_date?: string;
  is_active?: boolean;
}