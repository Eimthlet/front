import React, { useState, useEffect } from 'react';
import api from '../utils/api';
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

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'insights' | 'overview' | 'users' | 'seasons'>('overview');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsightsStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get('/api/admin/insights-stats');
        // Adding explicit type assertion for API response
        const data = response.data as InsightsStats;
        
        // Validate data
        if (!data || (!data.insights && !data.nonAdminUsers)) {
          throw new Error('No insights data available');
        }

        setStats(data);
      } catch (err: any) {
        console.error('Insights fetch error:', err);

        const errorMessage = err.response?.data?.error || 
          err.message || 
          'Failed to load dashboard data';

        setError({
          message: errorMessage,
          details: err.response?.data?.details
        });

        // Handle specific error scenarios
        if (err.response) {
          switch (err.response.status) {
            case 401:
              window.location.href = '/login';
              break;
            case 403:
              console.warn('Access forbidden');
              break;
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsightsStats();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Admin Dashboard</h1>
        </div>

        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <h3>Error Loading Dashboard</h3>
            <p>{error.message}</p>
            {error.details && <p className="error-details">{error.details}</p>}
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : !stats ? (
          <div className="no-data-message">
            <p>No dashboard data available</p>
          </div>
        ) : (
          <div className="dashboard-content">
            <div className="dashboard-sections">
              <button 
                className={activeSection === 'overview' ? 'active' : ''}
                onClick={() => setActiveSection('overview')}
              >
                Overview
              </button>
              <button 
                className={activeSection === 'insights' ? 'active' : ''}
                onClick={() => setActiveSection('insights')}
              >
                Player Insights
              </button>
              <button 
                className={activeSection === 'users' ? 'active' : ''}
                onClick={() => setActiveSection('users')}
              >
                Users
              </button>
              <button 
                className={activeSection === 'seasons' ? 'active' : ''}
                onClick={() => setActiveSection('seasons')}
              >
                Season Manager
              </button>
            </div>

            {activeSection === 'overview' && (
              <div className="dashboard-card overview">
                <h3>Game Statistics</h3>
                <div className="overview-stats">
                  <div className="stat-item">
                    <span className="stat-label">Average Score</span>
                    <span className="stat-value">{stats.averageScore}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Most Played Game</span>
                    <span className="stat-value">{stats.mostPlayedGame}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Least Played Game</span>
                    <span className="stat-value">{stats.leastPlayedGame}</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'insights' && (
              <div className="dashboard-card insights">
                <h3>Player Insights</h3>
                <div className="insights-list-container">
                  <ul className="insights-list">
                    {stats.insights.map((insight) => (
                      <li key={insight.id}>
                        <div className="player-details">
                          <span className="player-name">{insight.username}</span>
                          <span className="player-insight">{insight.insight}</span>
                        </div>
                        <div className="player-stats">
                          <span className="player-avg-score">Avg Score: {insight.average_score}</span>
                          <span className="player-total-games">Games: {insight.total_games}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'users' && (
              <div className="dashboard-card users">
                <h3>User Management</h3>
                <div className="user-list">
                  {stats.nonAdminUsers.map(user => (
                    <div className="user-item" key={user.id}>
                      <div className="user-info">
                        <span className="username">{user.username}</span>
                        <span className="email">{user.email}</span>
                      </div>
                      <div className="user-stats">
                        <span className="stat">Avg Score: {user.average_score}%</span>
                        <span className="stat">Games: {user.total_games}</span>
                        <span className="stat">High: {user.highest_score}%</span>
                        <span className="stat">Low: {user.lowest_score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeSection === 'seasons' && (
              <div className="dashboard-card seasons">
                <SeasonManager />
              </div>
            )}  
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
