import React, { useState } from 'react';
import CleverlyHero from './CleverlyHero';
import FileUpload from './FileUpload';
import ActionButtons from './ActionButton'; // ensure filename matches!
import Results from './Result';
import './App.css';

function App() {
  const [rawApiResult, setRawApiResult] = useState(null);
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('upload'); // stages: 'upload', 'choose', 'results'
  const [resultType, setResultType] = useState(null); // "flashcards", "quiz", "summary"
  const [results, setResults] = useState({
    flashcards: null,
    quiz: null,
    summary: null,
  });
  const [loading, setLoading] = useState(false); // For spinner during AI generation

  // Upload helper
  const handleFileUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type); // NEW: pass mode
    const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload PDF');
    return await response.json();
};
  const handleAction = async (type) => {
    setResultType(type);
    setStage('results');
    setLoading(true);
    try {
        const data = await handleFileUpload(file, type); // Ensure 'type' is sent!
        if (type === "flashcards") {
            setResults(prev => ({
                ...prev,
                flashcards: { flashcards: data.topics?.flatMap(t => t.flashcards ?? []) || [] }
            }));
        } else if (type === "quiz") {
            setResults(prev => ({
                ...prev,
                quiz: { quiz: data.topics?.flatMap(t => t.quiz ?? []) || [] }
            }));
        } else if (type === "summary") {
            setResults(prev => ({
                ...prev,
                summary: { summary: data.topics?.map(t => t.summary).join("\n\n") || "" }
            }));
        }
    } catch (err) {
        alert("Error: " + err.message);
        setStage('choose');
    } finally {
        setLoading(false);
    }
};



  // File "pill" show below upload
  const FilePill = ({ file, onRemove }) => (
    <div className="file-pill">
      <span role="img" aria-label="pdf">📄</span>
      {file.name}
      <button className="remove-btn" aria-label="Remove file" onClick={onRemove}>×</button>
    </div>
  );

  // When a file is uploaded, show action panel
  const handleFileSet = (selectedFile) => {
    setFile(selectedFile);
    setStage('choose');
    setResults({
      flashcards: null,
      quiz: null,
      summary: null,
    });
  };

  const handleRemoveFile = () => {
    setFile(null);
    setStage('upload');
    setResults({
      flashcards: null,
      quiz: null,
      summary: null,
    });
  };


  return (
    <div className="main-bg">
      <div className="centered-container">
        <CleverlyHero />
        {stage === 'upload' && (
          <FileUpload file={file} setFile={handleFileSet} setStage={setStage} />
        )}
        {file && stage !== 'upload' && (
          <FilePill file={file} onRemove={handleRemoveFile} />
        )}
        {file && stage === 'choose' && (
          <ActionButtons onAction={handleAction} />
        )}
        {stage === 'results' && (
          <Results
            type={resultType}
            data={results[resultType]}
            onBack={() => setStage('choose')}
            loading={loading}
          />
        )}
        
      </div>
    </div>
  );
}

export default App;
