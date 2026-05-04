import { useState, useCallback, useRef } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ConfidenceBadge({ confidence }) {
  const color =
    confidence >= 85 ? "#00ff87" : confidence >= 60 ? "#ffd600" : "#ff6b6b";
  return (
    <div className="confidence-badge" style={{ "--badge-color": color }}>
      <svg viewBox="0 0 36 36" className="confidence-ring">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1a2e" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${confidence} ${100 - confidence}`}
          strokeDashoffset="25"
          strokeLinecap="round"
        />
      </svg>
      <span>{confidence}%</span>
    </div>
  );
}

function FontCard({ font, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="font-card" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="font-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="font-main-info">
          <div className="font-name-row">
            <h3 className="font-name">{font.name}</h3>
            <span className="font-category">{font.category}</span>
            {font.style && <span className="font-style">{font.style}</span>}
          </div>
          {font.text_sample && (
            <p className="font-sample">"{font.text_sample}"</p>
          )}
        </div>
        <div className="font-right">
          <ConfidenceBadge confidence={font.confidence} />
          <button className="expand-btn">{expanded ? "▲" : "▼"}</button>
        </div>
      </div>

      {expanded && (
        <div className="font-details">
          {font.description && (
            <div className="detail-block">
              <h4>About</h4>
              <p>{font.description}</p>
            </div>
          )}
          <div className="detail-grid">
            {font.designer && (
              <div className="detail-item">
                <span className="label">Designer</span>
                <span className="value">{font.designer}</span>
              </div>
            )}
            {font.year && (
              <div className="detail-item">
                <span className="label">Year</span>
                <span className="value">{font.year}</span>
              </div>
            )}
            {font.usage && (
              <div className="detail-item full">
                <span className="label">Best For</span>
                <span className="value">{font.usage}</span>
              </div>
            )}
          </div>

          {font.alternatives?.length > 0 && (
            <div className="detail-block">
              <h4>Similar Fonts</h4>
              <div className="tags">
                {font.alternatives.map((alt) => (
                  <span key={alt} className="tag alt-tag">{alt}</span>
                ))}
              </div>
            </div>
          )}

          {font.where_to_find?.length > 0 && (
            <div className="detail-block">
              <h4>Where to Find</h4>
              <div className="tags">
                {font.where_to_find.map((src) => (
                  <span key={src} className="tag source-tag">{src}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const identify = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const res = await fetch(`${API_BASE}/api/identify`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Identification failed");
      setResult(data.data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="app">
      {/* Animated background */}
      <div className="bg-grid" />
      <div className="bg-glow" />

      <header className="header">
        <div className="logo">
          <span className="logo-icon">Aa</span>
          <div>
            <h1>Font<span>Lens</span></h1>
            <p className="tagline">AI-Powered Font Identifier</p>
          </div>
        </div>
        <div className="header-badge">Powered by Groq AI</div>
      </header>

      <main className="main">
        <div className="upload-section">
          <div
            className={`dropzone ${dragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !preview && fileRef.current?.click()}
          >
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Uploaded" className="preview-img" />
                <div className="preview-overlay">
                  <button className="change-btn" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                    Change Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="upload-text">Drop an image here</p>
                <p className="upload-sub">or click to browse</p>
                <p className="upload-hint">Supports JPG, PNG, WEBP • Max 10MB</p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden-input"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div className="action-row">
            {preview && (
              <button className="btn-secondary" onClick={reset}>
                Clear
              </button>
            )}
            <button
              className="btn-primary"
              onClick={identify}
              disabled={!image || loading}
            >
              {loading ? (
                <span className="loading-text">
                  <span className="spinner" />
                  Analyzing...
                </span>
              ) : (
                "🔍 Identify Fonts"
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-card">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="analyzing-card">
            <div className="analyze-anim">
              {["Scanning letterforms...", "Matching typeface patterns...", "Consulting font library..."].map((msg, i) => (
                <div key={i} className="analyze-step" style={{ animationDelay: `${i * 0.8}s` }}>
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="results-section">
            <div className="results-header">
              <h2>
                <span className="results-count">{result.fonts?.length || 0}</span>
                {result.fonts?.length === 1 ? " Font" : " Fonts"} Identified
              </h2>
              {result.image_context && (
                <p className="image-context">📄 {result.image_context}</p>
              )}
            </div>

            <div className="fonts-list">
              {result.fonts?.map((font, i) => (
                <FontCard key={`${font.name}-${i}`} font={font} index={i} />
              ))}
            </div>

            {result.overall_typography && (
              <div className="typography-card">
                <h3>Typography Analysis</h3>
                <div className="typo-grid">
                  {result.overall_typography.mood && (
                    <div className="typo-item">
                      <span className="typo-label">Mood</span>
                      <p>{result.overall_typography.mood}</p>
                    </div>
                  )}
                  {result.overall_typography.hierarchy && (
                    <div className="typo-item">
                      <span className="typo-label">Hierarchy</span>
                      <p>{result.overall_typography.hierarchy}</p>
                    </div>
                  )}
                  {result.overall_typography.pairing_notes && (
                    <div className="typo-item full">
                      <span className="typo-label">Pairing Notes</span>
                      <p>{result.overall_typography.pairing_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>FontLens — AI Font Identifier &nbsp;|&nbsp; Powered by Groq Vision AI</p>
      </footer>
    </div>
  );
}
