import { useState } from 'react';
import { UploadCloud, ArrowDownCircle, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppState } from '../context/AppContext';

export default function DropZone({ onFileUpload }) {
  const state = useAppState();
  const [isDragOver, setIsDragOver] = useState(false);

  // Event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const handleClick = () => {
    // Don't allow file selection during analysis
    if (state.uiState === 'analysis-running') return;

    // Open file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.pdf,.docx';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) validateAndUpload(file);
    };
    input.click();
  };

  const validateAndUpload = (file) => {
    // Validate file extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(ext)) {
      alert('Ugyldigt filformat. Kun .txt, .pdf og .docx understøttes.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Filen er for stor. Maksimal størrelse er 10MB.');
      return;
    }

    // Call upload callback
    onFileUpload({
      file,
      name: file.name,
      size: file.size,
      type: ext,
      path: file.path,  // Electron provides this
      uploadedAt: new Date()
    });
  };

  // Get dynamic icon based on state
  const getIcon = () => {
    // Show checkmark if file is uploaded (even before analysis)
    if (state.documentFile && !isDragOver && state.uiState !== 'analysis-running' && state.uiState !== 'error') {
      return <CheckCircle size={56} strokeWidth={2} className="success-icon" />;
    }

    switch (state.uiState) {
      case 'idle':
      case 'prompt-selected':
        return <UploadCloud size={56} strokeWidth={1.5} />;
      case 'file-hover':
        return <ArrowDownCircle size={56} strokeWidth={1.5} />;
      case 'analysis-running':
        return <Loader size={48} strokeWidth={2} className="spinner" />;
      case 'completed':
        return <CheckCircle size={56} strokeWidth={2} className="success-icon" />;
      case 'error':
        return <AlertTriangle size={56} strokeWidth={2} />;
      default:
        return <UploadCloud size={56} strokeWidth={1.5} />;
    }
  };

  // Get dynamic text based on state
  const getText = () => {
    switch (state.uiState) {
      case 'idle':
        return 'Træk dokument hertil';
      case 'prompt-selected':
        return 'Klar til at modtage';
      case 'file-hover':
        return 'Slip for at uploade';
      case 'analysis-running':
      case 'completed':
        return state.documentFile?.name || '';
      case 'error':
        return null;  // Hide text in error state
      default:
        return 'Træk dokument hertil';
    }
  };

  // Get CSS classes based on state
  const getClassName = () => {
    const classes = ['drop-zone'];

    if (isDragOver) classes.push('hovering');
    else if (state.uiState === 'analysis-running') classes.push('processing');
    else if (state.uiState === 'completed' || state.documentFile) classes.push('completed');
    else if (state.uiState === 'error') classes.push('error');

    return classes.join(' ');
  };

  return (
    <div
      className={getClassName()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Drop zone for document upload"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="drop-zone-icon">
        {getIcon()}
      </div>
      {getText() && (
        <div className="drop-zone-text">
          {getText()}
        </div>
      )}
    </div>
  );
}
