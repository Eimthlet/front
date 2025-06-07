import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import './AdminDashboard.css';
import SeasonManager from './SeasonManager';

// Remove any leftover fragments

interface NonAdminUser {
  id: string;
  username: string;
  email: string;
  average_score: number;
  total_games: number;
  highest_score: number;
  lowest_score: number;
}

interface InsightsStats {
  averageScore: number;
  mostPlayedGame: string;
  leastPlayedGame: string;
  insights: Array<{
    id: string;
    username: string;
    insight: string;
    average_score: number;
    total_games: number;
  }>;
  totalUsers: number;
  nonAdminUsers: NonAdminUser[];
}

interface DashboardStats {
  totalUsers: number;
  totalQuizzes: number;
  averageScore: number;
  recentActivity: Array<{
    id: number;
    type: string;
    timestamp: string;
    details: string;
  }>;
}

interface DashboardResponse {
  totalUsers: number;
  totalQuizzes: number;
  averageScore: number;
  recentActivity: Array<{
    id: number;
    type: string;
    timestamp: string;
    details: string;
  }>;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface DashboardStatsResponse {
  data: {
    totalUsers: number;
    totalQuizzes: number;
    averageScore: number;
    recentActivity: Array<{
      id: number;
      type: string;
      timestamp: string;
      details: string;
    }>;
  };
  error?: string;
}

interface ErrorState {
  message: string;
  isError: boolean;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalQuizzes: 0,
    averageScore: 0,
    recentActivity: []
  });
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      // Fetch insights stats
      const response = await apiClient.get<ApiResponse<DashboardResponse> | DashboardResponse>('/api/admin/insights-stats');
      
      // Check if the response is an error response
      if ('error' in response && response.error) {
        throw new Error(response.error);
      }
      
      // Handle both response formats
      const dashboardData = 'data' in response ? response.data : response;
      
      setStats({
        totalUsers: dashboardData.totalUsers,
        totalQuizzes: dashboardData.totalQuizzes,
        averageScore: dashboardData.averageScore,
        recentActivity: dashboardData.recentActivity || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    }
  };

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
            <h3>Total Quizzes</h3>
            <p>{stats.totalQuizzes}</p>
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
