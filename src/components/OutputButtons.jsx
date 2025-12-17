import OutputButton from './OutputButton';

export default function OutputButtons({ visible, onExport }) {
  return (
    <div className={`output-buttons ${!visible ? 'hidden' : ''}`}>
      <OutputButton
        label="Word"
        format="docx"
        onClick={() => onExport('docx')}
      />
      <OutputButton
        label="PDF"
        format="pdf"
        onClick={() => onExport('pdf')}
      />
      <OutputButton
        label="Markdown"
        format="md"
        onClick={() => onExport('md')}
      />
    </div>
  );
}
