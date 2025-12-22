import { useState, useEffect, useCallback, useRef } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  recentAnalyses,
  onSettingChange
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Refs to store timeout IDs for cleanup
  const closeTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // ========== Close Behavior ==========

  const handleClose = useCallback(() => {
    setIsClosing(true);

    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    // Set new timeout and store the ID
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
      closeTimeoutRef.current = null;
    }, 400);
  }, [onClose]);

  // ESC key listener
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  // ========== Auto-Save with Toast ==========

  function triggerSaveToast() {
    setShowSaveToast(true);

    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Set new timeout and store the ID
    toastTimeoutRef.current = setTimeout(() => {
      setShowSaveToast(false);
      toastTimeoutRef.current = null;
    }, 2000);
  }

  async function handleChange(key, value) {
    try {
      await onSettingChange(key, value);
      triggerSaveToast();
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  }

  // ========== Logo Upload & Preview ==========

  async function handleLogoUpload() {
    try {
      setUploadingLogo(true);
      const logoPath = await window.electronAPI.selectFile([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }
      ]);

      if (logoPath) {
        await handleChange('logoPath', logoPath);
        // Load logo preview
        loadLogoPreview(logoPath);
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function loadLogoPreview(logoPath) {
    if (!logoPath) {
      setLogoPreview(null);
      return;
    }

    try {
      const dataUrl = await window.electronAPI.loadLogo(logoPath);
      setLogoPreview(dataUrl);
    } catch (error) {
      console.error('Failed to load logo preview:', error);
      setLogoPreview(null);
    }
  }

  // Load logo preview when settings change
  useEffect(() => {
    if (settings.logoPath) {
      loadLogoPreview(settings.logoPath);
    } else {
      setLogoPreview(null);
    }
  }, [settings.logoPath]);

  function getFilename(path) {
    if (!path) return '';
    return path.split(/[/\\]/).pop();
  }

  // ========== Format Toggles ==========

  async function toggleFormat(format) {
    const currentFormats = settings.defaultFormats || [];
    const newFormats = currentFormats.includes(format)
      ? currentFormats.filter(f => f !== format)
      : [...currentFormats, format];

    // Ensure at least one format is selected
    if (newFormats.length === 0) {
      return;
    }

    await handleChange('defaultFormats', newFormats);
  }

  // ========== Reset to Defaults ==========

  async function handleResetSettings() {
    try {
      // Call backend to reset settings
      const defaultSettings = await window.electronAPI.resetSettings();

      // Update all settings in the UI one by one
      // Logo
      await onSettingChange('logoPath', defaultSettings.logoPath || null);

      // Default formats (all selected)
      await onSettingChange('defaultFormats', defaultSettings.outputPreferences?.defaultFormats || ['pdf', 'docx', 'md']);

      // Auto-open (false)
      await onSettingChange('autoOpen', defaultSettings.outputPreferences?.autoOpen || false);

      // Clear recent analyses (by updating state - this doesn't persist)
      // The recentAnalyses are managed separately and will be empty after reset

      setShowResetConfirm(false);
      setLogoPreview(null); // Clear logo preview
      triggerSaveToast();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }

  // ========== Recent Analyses ==========

  function formatDate(isoDate) {
    // "2024-12-18" → "18-12-2024"
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
  }

  function getPromptLabel(promptType) {
    const labels = {
      'franchise-contract-review': 'Kontrakt',
      'franchise-manual-review': 'Manual',
      'franchise-compliance-audit': 'Compliance',
      'compliance-check': 'Compliance'
    };
    return labels[promptType] || promptType;
  }

  async function openFolder(folderPath) {
    try {
      await window.electronAPI.openPath(folderPath);
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }

  // ========== Render ==========

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`settings-modal-backdrop ${isOpen && !isClosing ? 'open' : ''}`}
        onClick={handleClose}
      >
        {/* Panel */}
        <div
          className={`settings-modal-panel ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="settings-header">
            <h2>Indstillinger</h2>
            <button
              className="close-button"
              onClick={handleClose}
              aria-label="Luk indstillinger"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="settings-content">

            {/* Section 4: Recent Analyses */}
            <div className="settings-section">
              <h3>Seneste Analyser</h3>
              {recentAnalyses && recentAnalyses.length > 0 ? (
                <div className="recent-list">
                  {recentAnalyses.slice(0, 5).map((analysis, idx) => (
                    <button
                      key={idx}
                      className="recent-item"
                      onClick={() => openFolder(analysis.outputPath)}
                    >
                      <span className="arrow">›</span>
                      <span className="client">{analysis.clientName || 'Unnamed Client'}</span>
                      <span className="separator">•</span>
                      <span className="date">{formatDate(analysis.date)}</span>
                      <span className="separator">•</span>
                      <span className="prompt">{getPromptLabel(analysis.promptType)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Ingen analyser endnu</p>
              )}
            </div>

            {/* Section 3: Session State */}
            <div className="settings-section">
              <h3>Seneste Provider</h3>
              <p className="provider-display">
                {settings.lastProvider || 'Ingen valgt'}
              </p>
            </div>

            {/* Section 2: Output Preferences */}
            <div className="settings-section">
              <h3>Output Præferencer</h3>

              <div className="checkbox-group">
                <label>Standard formater:</label>
                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={(settings.defaultFormats || []).includes('pdf')}
                      onChange={() => toggleFormat('pdf')}
                    />
                    PDF
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={(settings.defaultFormats || []).includes('docx')}
                      onChange={() => toggleFormat('docx')}
                    />
                    Word
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={(settings.defaultFormats || []).includes('md')}
                      onChange={() => toggleFormat('md')}
                    />
                    Markdown
                  </label>
                </div>
              </div>

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoOpen || false}
                    onChange={(e) => handleChange('autoOpen', e.target.checked)}
                  />
                  Åbn rapporter automatisk efter generering
                </label>
              </div>
            </div>

            {/* Section 1: Style Settings */}
            <div className="settings-section">
              <h3>Udseende</h3>

              {/* Logo Upload with Thumbnail Preview */}
              <div className="input-group">
                <label>Logo:</label>
                <div className="logo-upload-container">
                  <button
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="upload-button"
                  >
                    {uploadingLogo ? 'Indlæser...' : 'Vælg logo'}
                  </button>
                  {logoPreview && (
                    <div className="logo-thumbnail">
                      <img src={logoPreview} alt="Logo preview" />
                    </div>
                  )}
                  {!logoPreview && settings.logoPath && (
                    <span className="logo-filename">
                      {getFilename(settings.logoPath)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Reset to Defaults */}
            <div className="settings-section">
              <h3>Nulstil Indstillinger</h3>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="reset-button"
                >
                  Nulstil til standardindstillinger
                </button>
              ) : (
                <div className="reset-confirm">
                  <p className="confirm-message">
                    Er du sikker? Dette vil nulstille alle indstillinger til standardværdier.
                  </p>
                  <div className="confirm-buttons">
                    <button
                      onClick={handleResetSettings}
                      className="confirm-yes"
                    >
                      Ja, nulstil
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="confirm-no"
                    >
                      Annuller
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Save Toast */}
      <div className={`save-toast ${showSaveToast ? 'show' : ''}`}>
        Gemt
      </div>
    </>
  );
}
