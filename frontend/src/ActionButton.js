import React from 'react';

function ActionButtons({ onAction }) {
  return (
    <div className="options-panel">
      <h3>What would you like to do with your file?</h3>
      <div className="action-btn-group">
        <button className="action-btn" onClick={() => onAction('flashcards')}>
          Make Flashcards
        </button>
        <button className="action-btn" onClick={() => onAction('quiz')}>
          Build a quiz
        </button>
      </div>
      <button className="action-btn summarize-btn" onClick={() => onAction('summary')}>
        Summarize
      </button>
    </div>
  );
}

export default ActionButtons;
