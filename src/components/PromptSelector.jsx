import PromptButton from './PromptButton';

export default function PromptSelector({ selected, onSelect, visible }) {
  return (
    <div className={`prompt-buttons ${!visible ? 'hidden' : ''}`}>
      <PromptButton
        label="Kontrakt"
        promptName="franchise-contract-review"
        selected={selected === 'franchise-contract-review'}
        onClick={() => onSelect('franchise-contract-review')}
      />
      <PromptButton
        label="Manual"
        promptName="franchise-manual-review"
        selected={selected === 'franchise-manual-review'}
        onClick={() => onSelect('franchise-manual-review')}
      />
      <PromptButton
        label="Compliance"
        promptName="compliance-check"
        selected={selected === 'compliance-check'}
        onClick={() => onSelect('compliance-check')}
      />
    </div>
  );
}
