import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import './AdminDashboard.css';

interface ActivityItem {
  id: number;
  user_id?: number;
  username?: string;
  email?: string;
  type: string;
  action?: string;
  timestamp: string;
  details?: string;
}

interface PerformerItem {
  user_id: number;
  username: string;
  email: string;
  score: number;
  completedAt: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalQuestions: number;
  averageScore: number;
  completedAttempts: number;
  recentActivity: ActivityItem[];
  topPerformers: PerformerItem[];
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalQuestions: 0,
    averageScore: 0,
    completedAttempts: 0,
    recentActivity: [],
    topPerformers: []
  });
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await apiClient.get('/admin/stats');
      
      setStats({
        totalUsers: data.users?.total ?? 0,
        activeUsers: data.users?.active ?? 0,
        totalQuestions: data.quizStats?.totalQuestions ?? 0,
        averageScore: data.quizStats?.averageScore ?? 0,
        completedAttempts: data.quizStats?.completedAttempts ?? 0,
        recentActivity: data.recentActivity ?? [],
        topPerformers: data.topPerformers ?? []
      });
      setError(null);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to fetch dashboard data');
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Admin Dashboard</h1>
        </div>

        {error && (
          <div className="error-message">
            <h3>Error Loading Dashboard</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Total Questions</h3>
            <p>{stats.totalQuestions}</p>
          </div>
          <div className="stat-card">
            <h3>Average Score</h3>
            <p>{stats.averageScore}%</p>
          </div>
        </div>

        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {stats.recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <span className="activity-type">{activity.type}</span>
                <span className="activity-time">{new Date(activity.timestamp).toLocaleString()}</span>
                <p className="activity-details">{activity.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
