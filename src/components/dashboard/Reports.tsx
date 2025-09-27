import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { supabase } from '../../lib/supabase';
import type { Project, Task, Member } from '../../types';
import { 
  TrendingUp, TrendingDown, Users, CheckCircle, Clock, AlertCircle, 
  Target, Calendar, BarChart3, PieChart as PieChartIcon 
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
const STATUS_COLORS = {
  'not_started': '#6B7280',
  'in_progress': '#3B82F6', 
  'completed': '#10B981',
  'overdue': '#EF4444'
};

const Reports: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectsRes, tasksRes, membersRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('members').select('*'),
        ]);
        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (membersRes.error) throw membersRes.error;
        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
        setMembers(membersRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper function to check if date is in period
  const isInPeriod = (dateStr: string, type: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (type === 'daily') {
      return date.toDateString() === now.toDateString();
    }
    if (type === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return date >= startOfWeek && date <= endOfWeek;
    }
    if (type === 'monthly') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (type === 'annual') {
      return date.getFullYear() === now.getFullYear();
    }
    return false;
  };

  // Filter data by report type
  const filteredTasks = tasks.filter(task => isInPeriod(task.created_at, reportType));

  // 1. Task Status Distribution (Pie Chart)
  const taskStatusData = [
    { name: 'Not Started', value: filteredTasks.filter(t => t.status === 'not_started').length, color: STATUS_COLORS.not_started },
    { name: 'In Progress', value: filteredTasks.filter(t => t.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
    { name: 'Completed', value: filteredTasks.filter(t => t.status === 'completed').length, color: STATUS_COLORS.completed },
    { name: 'Overdue', value: filteredTasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length, color: STATUS_COLORS.overdue }
  ];

  // 2. Tasks per Project (Bar Chart)
  const tasksPerProject = projects.map(project => ({
    name: project.name,
    total: filteredTasks.filter(task => task.project_id === project.id).length,
    completed: filteredTasks.filter(task => task.project_id === project.id && task.status === 'completed').length,
    inProgress: filteredTasks.filter(task => task.project_id === project.id && task.status === 'in_progress').length,
    notStarted: filteredTasks.filter(task => task.project_id === project.id && task.status === 'not_started').length,
  }));

  // 3. Team Member Performance (Horizontal Bar Chart)
  const memberPerformance = members.map(member => {
    const memberTasks = filteredTasks.filter(task => task.user_id === member.id);
    const completed = memberTasks.filter(t => t.status === 'completed').length;
    const total = memberTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      name: member.name,
      totalTasks: total,
      completedTasks: completed,
      completionRate: Math.round(completionRate),
      inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  // 4. Task Completion Trend (Line Chart)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const taskTrendData = getLast7Days().map(date => {
    const dayTasks = filteredTasks.filter(task => 
      task.created_at.startsWith(date) || 
      (task.completed_at && task.completed_at.startsWith(date))
    );
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      created: dayTasks.filter(t => t.created_at.startsWith(date)).length,
      completed: dayTasks.filter(t => t.completed_at && t.completed_at.startsWith(date)).length,
    };
  });

  // 5. Priority Distribution (Donut Chart)
  const priorityData = [
    { name: 'High', value: filteredTasks.filter(t => t.priority === 'high').length, color: '#EF4444' },
    { name: 'Medium', value: filteredTasks.filter(t => t.priority === 'medium').length, color: '#F59E0B' },
    { name: 'Low', value: filteredTasks.filter(t => t.priority === 'low').length, color: '#10B981' },
  ];

  // 6. Project Progress (Area Chart)
  const projectProgress = projects.map(project => {
    const projectTasks = filteredTasks.filter(task => task.project_id === project.id);
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      name: project.name,
      progress: Math.round(progress),
      total,
      completed,
    };
  });

  // Key Metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = filteredTasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  }).length;

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="p-6">
      <div className="text-red-500 text-center">{error}</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Task Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Comprehensive task performance and team insights</p>
        </div>
        
        {/* Report type selector */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'annual', label: 'Annual' },
          ].map(rt => (
            <button
              key={rt.key}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                reportType === rt.key 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setReportType(rt.key as any)}
            >
              {rt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{overdueTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <PieChartIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Task Status Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Team Member Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Team Member Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={memberPerformance} layout="horizontal">
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
              <Bar dataKey="completionRate" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks per Project */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Tasks per Project</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={tasksPerProject}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3B82F6" name="Total Tasks" />
              <Bar dataKey="completed" fill="#10B981" name="Completed" />
              <Bar dataKey="inProgress" fill="#F59E0B" name="In Progress" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Task Completion Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Task Completion Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskTrendData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#3B82F6" name="Tasks Created" />
              <Line type="monotone" dataKey="completed" stroke="#10B981" name="Tasks Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Task Priority Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Project Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projectProgress}>
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
              <Area type="monotone" dataKey="progress" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports; 