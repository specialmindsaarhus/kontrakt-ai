import OutputButton from './OutputButton';

export default function OutputButtons({ visible, onExport, selectedFormats }) {
  // Don't show buttons if only one format is selected (auto-generated, no choice needed)
  if (!selectedFormats || selectedFormats.length <= 1) {
    return null;
  }

  const formatConfig = {
    docx: { label: 'Word', format: 'docx' },
    pdf: { label: 'PDF', format: 'pdf' },
    md: { label: 'Markdown', format: 'md' }
  };

  return (
    <div className={`output-buttons ${!visible ? 'hidden' : ''}`}>
      {selectedFormats.map(format => {
        const config = formatConfig[format];
        if (!config) return null;

        return (
          <OutputButton
            key={format}
            label={config.label}
            format={config.format}
            onClick={() => onExport(config.format)}
          />
        );
      })}
    </div>
  );
}
