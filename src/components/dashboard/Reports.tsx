import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import type { Project, Task, Leave, Member } from '../../types';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#fa8072'];
const REPORT_TYPES = [
  { key: 'daily', label: 'Daily Report' },
  { key: 'weekly', label: 'Weekly Report' },
  { key: 'monthly', label: 'Monthly Report' },
  { key: 'annual', label: 'Annual Report' },
];

function isInPeriod(dateStr: string, type: string) {
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
}

const Reports: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('daily');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectsRes, tasksRes, leavesRes, membersRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('leaves').select('*'),
          supabase.from('members').select('*'),
        ]);
        if (projectsRes.error) throw projectsRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (leavesRes.error) throw leavesRes.error;
        if (membersRes.error) throw membersRes.error;
        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
        setLeaves(leavesRes.data || []);
        setMembers(membersRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter data by report type
  const filteredTasks = tasks.filter(task => isInPeriod(task.created_at, reportType));
  const filteredLeaves = leaves.filter(leave => isInPeriod(leave.created_at, reportType));

  // Aggregate: Tasks per Project
  const tasksPerProject = projects.map(project => ({
    project: project.name,
    tasks: filteredTasks.filter(task => task.project_id === project.id).length,
  }));

  // Aggregate: Task Status Distribution
  const statusCounts = ['not_started', 'in_progress', 'completed'].map(status => ({
    status,
    value: filteredTasks.filter(task => task.status === status).length,
  }));

  // Aggregate: Leaves per Member
  const leavesPerMember = members.map(member => ({
    member: member.name,
    leaves: filteredLeaves.filter(leave => leave.user_id === member.id).length,
  }));

  // Written summary
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
  const mostActiveMember = (() => {
    let max = 0, name = '';
    members.forEach(member => {
      const count = filteredTasks.filter(t => t.user_id === member.id).length;
      if (count > max) {
        max = count;
        name = member.name;
      }
    });
    return name || 'N/A';
  })();
  const totalLeaves = filteredLeaves.length;

  if (loading) return <div>Loading reports...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Analytics & Reports</h2>
      {/* Report type selector */}
      <div className="mb-6 flex gap-4">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            className={`px-4 py-2 rounded font-semibold border transition-colors duration-200 ${reportType === rt.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'}`}
            onClick={() => setReportType(rt.key as any)}
          >
            {rt.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Tasks per Project</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tasksPerProject}>
              <XAxis dataKey="project" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusCounts} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={100} fill="#82ca9d" label>
                {statusCounts.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Leaves Taken per Member</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leavesPerMember}>
              <XAxis dataKey="member" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="leaves" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Written summary */}
        <div className="bg-white rounded shadow p-4 flex flex-col justify-center">
          <h3 className="font-semibold mb-2">{REPORT_TYPES.find(rt => rt.key === reportType)?.label} Summary</h3>
          <ul className="list-disc ml-6 space-y-2">
            <li>Total tasks created: <span className="font-bold">{totalTasks}</span></li>
            <li>Tasks completed: <span className="font-bold">{completedTasks}</span></li>
            <li>Most active member: <span className="font-bold">{mostActiveMember}</span></li>
            <li>Total leaves taken: <span className="font-bold">{totalLeaves}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports; 