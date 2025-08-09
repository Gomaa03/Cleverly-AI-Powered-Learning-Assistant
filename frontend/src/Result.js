import React, { useState } from 'react';
import './App.css';

function normalizeSummary(summary) {
  if (Array.isArray(summary)) {
    return summary.join('\n\n');
  }
  return summary || "";
}

// Converts [["Q","A"], ...] -> [{question:..., answer:...}]
function normalizeFlashcards(flashcards) {
  if (Array.isArray(flashcards) && flashcards.length && Array.isArray(flashcards[0])) {
    return flashcards.map(arr => ({
      question: arr[0] || "", 
      answer: arr[1] || ""
    }));
  }
  // If already an object array or empty
  return flashcards || [];
}

// Handles both "quiz" and "quizQuestions", and supports array of objects only
function normalizeQuiz(data) {
  let quiz = data.quiz || data.quizQuestions || [];
  if (!Array.isArray(quiz)) quiz = [];
  // If the answer is a letter ('A'), replace with the right string option
  quiz = quiz.map(q => {
    if (
      q &&
      typeof q === 'object' &&
      typeof q.answer === "string" &&
      q.options &&
      Array.isArray(q.options) &&
      /^[A-D]$/.test(q.answer.trim())
    ) {
      // Convert 'A'/'B'/etc. to the actual answer string
      const idx = "ABCD".indexOf(q.answer.trim().toUpperCase());
      if (idx !== -1 && idx < q.options.length) {
        return { ...q, answer: q.options[idx] };
      }
    }
    return q;
  });
  return quiz;
}

function Results({ type, data, onBack, loading }) {
  // ---- NORMALIZATION PATCHES ----
  const safeData = data || {};
  const summaryString = normalizeSummary(safeData.summary);
  const flashcards = normalizeFlashcards(safeData.flashcards);
  const quizArray = normalizeQuiz(safeData);

  // ---- FLASHCARD STATE ----
  const [cardIndex, setCardIndex] = useState(0);

  // ---- QUIZ STATE ----
  const quizLen = quizArray.length;
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedQuizOpt, setSelectedQuizOpt] = useState(null);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Reset navigation on new data/type
  React.useEffect(() => {
    setCardIndex(0);
    setQuizIndex(0);
    setSelectedQuizOpt(null);
    setShowQuizResult(false);
  }, [type, data]);

  // Defensive: in case index is out of bounds
  const currentQuiz = quizArray[quizIndex] || {};

  // ---- ERROR DISPLAY ----
  if (safeData.error) {
    return (
      <div className="summary-center-outer">
        <div className="summary-center-inner">
          <div className="summary-box" style={{ color: "#b95b48", fontWeight: "bold" }}>
            ❌ AI output could not be processed. Please try again or use a different PDF.
            <br /><br />
            <small>{safeData.error}</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-section">
      <button className="back-btn" onClick={onBack}>&larr; Back</button>
      <h2 className="results-title">
        {type === 'flashcards' && 'Flashcards'}
        {type === 'quiz' && 'Quiz'}
        {type === 'summary' && 'Summary'}
      </h2>

      {/* LOADING SPINNER */}
      {loading && (
        <div className="loading-indicator" style={{
          fontSize: "1.5em", color: "#212529", margin: "45px 0"
        }}>
          <span className="spinner" style={{
            marginRight: 14, width: 24, height: 24, borderRadius: "50%",
            border: "4px solid #7678ed",
            borderTop: "4px solid #ebf7f7ff",
            display: "inline-block",
            animation: "spin 0.85s linear infinite"
          }}></span>
          Generating with AI, please wait…
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg);}
              100% { transform: rotate(360deg);}
            }
          `}</style>
        </div>
      )}

      {/* FLASHCARD CAROUSEL */}
      {type === 'flashcards' && Array.isArray(flashcards) && flashcards.length > 0 && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="flashcard">
            <div><strong>Q:</strong> {flashcards[cardIndex].question}</div>
            <div className="answer-box" style={{ marginTop: 18 }}>
              <strong>A:</strong> {flashcards[cardIndex].answer}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 24, alignItems: 'center' }}>
            <button
              className="action-btn flashcard-nav-btn"
              style={{ opacity: cardIndex === 0 ? 0.5 : 1 }}
              onClick={() => setCardIndex(cardIndex - 1)}
              disabled={cardIndex === 0}
            >&#8592; Prev</button>
            <span style={{ fontWeight: 600, fontSize: "1.15em", userSelect: "none" }}>
              {cardIndex + 1} / {flashcards.length}
            </span>
            <button
              className="action-btn flashcard-nav-btn"
              style={{ opacity: cardIndex === flashcards.length - 1 ? 0.5 : 1 }}
              onClick={() => setCardIndex(cardIndex + 1)}
              disabled={cardIndex === flashcards.length - 1}
            >Next &#8594;</button>
          </div>
        </div>
      )}

      {/* QUIZ CAROUSEL */}
      {type === 'quiz' && quizLen > 0 && !loading && (
        <div className="quiz-list" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="quiz-q">
            <div><strong>Q{quizIndex + 1}:</strong> {currentQuiz.question}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
              {(currentQuiz.options || []).map((opt, j) => (
                <button
                  key={j}
                  className={
                    "quiz-option-btn" +
                    (showQuizResult && opt === currentQuiz.answer ? " correct" : "") +
                    (showQuizResult && selectedQuizOpt === opt && opt !== currentQuiz.answer ? " wrong" : "")
                  }
                  onClick={() => {
                    if (!showQuizResult) {
                      setSelectedQuizOpt(opt);
                      setShowQuizResult(true);
                    }
                  }}
                  disabled={showQuizResult}
                  aria-label={opt}
                >
                  {opt}
                </button>
              ))}
            </div>
            {showQuizResult && (
              <div className="quiz-feedback">
                {selectedQuizOpt === currentQuiz.answer
                  ? "✅ Correct!"
                  : <>❌ Oops… The correct answer is: <span className="answer-box" style={{ marginLeft: 6 }}>{currentQuiz.answer}</span></>
                }
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 24, alignItems: 'center' }}>
            <button
              className="action-btn flashcard-nav-btn"
              style={{ opacity: quizIndex === 0 ? 0.5 : 1 }}
              onClick={() => {
                setQuizIndex(quizIndex - 1);
                setSelectedQuizOpt(null);
                setShowQuizResult(false);
              }}
              disabled={quizIndex === 0}
            >&#8592; Prev</button>
            <span style={{ fontWeight: 600, fontSize: "1.15em" }}>
              {quizIndex + 1} / {quizLen}
            </span>
            <button
              className="action-btn flashcard-nav-btn"
              style={{ opacity: quizIndex === quizLen - 1 ? 0.5 : 1 }}
              onClick={() => {
                setQuizIndex(quizIndex + 1);
                setSelectedQuizOpt(null);
                setShowQuizResult(false);
              }}
              disabled={quizIndex === quizLen - 1}
            >Next &#8594;</button>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      {type === 'summary' && !loading && (
        <div className="summary-center-outer">
          <div className="summary-center-inner">
            <div className="summary-box">{summaryString}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Results;
