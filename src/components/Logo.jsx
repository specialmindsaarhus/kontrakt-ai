import { useState, useEffect } from 'react';

export default function Logo({ logoPath }) {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLogoImage() {
      if (logoPath) {
        console.log('[Logo] Received logoPath:', logoPath);
        setLoading(true);

        try {
          // Load logo via IPC (converts to base64 data URL)
          const dataUrl = await window.electronAPI.loadLogo(logoPath);

          if (dataUrl) {
            console.log('[Logo] Successfully loaded logo as data URL');
            setImageSrc(dataUrl);
            setImageError(false);
          } else {
            console.warn('[Logo] Failed to load logo, using fallback');
            setImageSrc(null);
            setImageError(true);
          }
        } catch (error) {
          console.error('[Logo] Error loading logo:', error);
          setImageSrc(null);
          setImageError(true);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('[Logo] No logoPath provided, showing default "K"');
        setImageSrc(null);
        setImageError(false);
        setLoading(false);
      }
    }

    loadLogoImage();
  }, [logoPath]);

  const handleImageError = (e) => {
    console.error('[Logo] Failed to load image:', imageSrc, e);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('[Logo] Image loaded successfully:', imageSrc);
  };

  if (imageSrc && !imageError) {
    return (
      <div className="app-logo">
        <img
          src={imageSrc}
          alt="Logo"
          className="logo-image"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
    );
  }

  // Fallback to "K" if no logo or image failed to load
  return (
    <div className="app-logo">K</div>
  );
}
