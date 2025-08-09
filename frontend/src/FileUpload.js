import React from 'react';

function FileUpload({ file, setFile }) {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setFile(null);
  };

  return (
    <div>
      {!file ? (
        <div className="upload-panel">
          <label className="upload-label">
            <span className="upload-icon" role="img" aria-label="pdf">📄</span>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <span className="upload-text">
              Upload your PDF notes or textbook here
            </span>
          </label>
        </div>
      ) : (
        <div className="file-pill">
          <span role="img" aria-label="pdf">📄</span>
          {file.name}
          <button className="remove-btn" aria-label="Remove file" onClick={handleRemove}>×</button>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
