import express from 'express';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import path from 'path';
import { promises as fs } from 'fs';
import { isAdmin } from '../index.js';

// Ensure all routes that require admin access use the middleware

const router = express.Router();
const db = new sqlite3.Database(path.join(process.cwd(), 'quiz.db'));
const DISQUALIFIED_USERS_PATH = path.join(process.cwd(), 'disqualified_users.json');

// Get all users with their latest quiz results
router.get('/users', isAdmin, (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.email,
      u.created_at,
      qr.score,
      r.round_number,
      r.min_score_to_qualify,
      s.name as season_name,
      CASE 
        WHEN qr.score >= r.min_score_to_qualify THEN 1
        ELSE 0
      END as qualified
    FROM users u
    LEFT JOIN quiz_results qr ON u.id = qr.user_id
    LEFT JOIN rounds r ON qr.round_id = r.id
    LEFT JOIN seasons s ON qr.season_id = s.id
    ORDER BY u.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get disqualified users
router.get('/disqualified-users', isAdmin, async (req, res) => {
  try {
    // Read disqualified users from file
    let disqualifiedUsers = [];
    try {
      const data = await fs.readFile(DISQUALIFIED_USERS_PATH, 'utf8');
      disqualifiedUsers = JSON.parse(data);
    } catch (readError) {
      // If file doesn't exist, return an empty array
      if (readError.code !== 'ENOENT') {
        throw readError;
      }
    }

    // Fetch additional user details for disqualified users
    const detailedDisqualifiedUsers = await Promise.all(
      disqualifiedUsers.map(async (disqUser) => {
        return new Promise((resolve, reject) => {
          db.get(
            'SELECT id, email, username FROM users WHERE id = ?', 
            [disqUser.id], 
            (err, userDetails) => {
              if (err) {
                console.error('Error fetching user details:', err);
                resolve({
                  ...disqUser,
                  email: 'Unknown',
                  username: 'Unknown'
                });
              } else {
                resolve({
                  ...disqUser,
                  email: userDetails?.email || 'Unknown',
                  username: userDetails?.username || 'Unknown'
                });
              }
            }
          );
        });
      })
    );

    res.json(detailedDisqualifiedUsers);
  } catch (error) {
    console.error('Error fetching disqualified users:', error);
    res.status(500).json({ error: 'Failed to fetch disqualified users' });
  }
});

// Get detailed stats for a specific user
router.get('/users/:userId', isAdmin, (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT 
      qr.score,
      qr.completed_at,
      r.round_number,
      r.min_score_to_qualify,
      s.name as season_name,
      CASE 
        WHEN qr.score >= r.min_score_to_qualify THEN 1
        ELSE 0
      END as qualified
    FROM quiz_results qr
    JOIN rounds r ON qr.round_id = r.id
    JOIN seasons s ON qr.season_id = s.id
    WHERE qr.user_id = ?
    ORDER BY qr.completed_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching user stats:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get season statistics
router.get('/seasons', isAdmin, (req, res) => {
  const query = `
    SELECT 
      s.id,
      s.name,
      COUNT(DISTINCT qr.user_id) as total_participants,
      AVG(qr.score) as average_score,
      COUNT(CASE WHEN qr.score >= r.min_score_to_qualify THEN 1 END) as qualified_users
    FROM seasons s
    LEFT JOIN quiz_results qr ON s.id = qr.season_id
    LEFT JOIN rounds r ON qr.round_id = r.id
    GROUP BY s.id
    ORDER BY s.start_date DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching season stats:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

export default router;
