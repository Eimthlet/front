import React from 'react';

interface ResultProps {
  score: number;
  total: number;
  onRestart: () => void;
}

const Result: React.FC<ResultProps> = ({ score, total, onRestart }) => {
  const percentage = Math.round((score / total) * 100);
  let message = '';
  let emoji = '';
  if (percentage === 100) { message = 'Perfect! You are a car genius!'; emoji = '🏆'; }
  else if (percentage >= 80) { message = 'Excellent job!'; emoji = '🚗'; }
  else if (percentage >= 50) { message = 'Good effort!'; emoji = '👍'; }
  else { message = 'Keep practicing!'; emoji = '🔧'; }

  return (
    <section className="result-main-container">
      <div className="result-card">
        <div className="result-badge">
          <span className="result-score">{score}</span>
          <span className="result-total">/ {total}</span>
        </div>
        <div className="result-status">
          <span className="result-emoji" aria-label="result emoji">{emoji}</span>
          <span className="result-message">{message}</span>
        </div>
        <button className="result-btn" onClick={onRestart}>Try Again</button>
      </div>
    </section>
  );
};

export default Result;
