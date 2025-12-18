import { AlertTriangle } from 'lucide-react';
import ProviderButton from './ProviderButton';

/**
 * ProviderSelector Component
 *
 * Allows users to manually choose which LLM CLI to use for analysis.
 * Shows only available (installed) providers.
 *
 * Props:
 * - availableProviders: Array of provider objects
 * - selected: Currently selected provider name
 * - onSelect: Callback when provider is selected
 * - visible: Whether to show the selector
 */
function ProviderSelector({ availableProviders, selected, onSelect, visible }) {
  // Filter to only show available providers
  const installedProviders = availableProviders.filter(p => p.available);

  // If no providers available, show error message
  if (installedProviders.length === 0) {
    return (
      <div className={`provider-error ${!visible && 'hidden'}`}>
        <AlertTriangle size={20} />
        <p>Ingen LLM CLI fundet. Installer mindst én:</p>
        <ul>
          <li><a href="https://ai.google.dev/gemini-api/docs/cli" target="_blank" rel="noopener noreferrer">Gemini CLI</a></li>
          <li><a href="https://claude.ai/cli" target="_blank" rel="noopener noreferrer">Claude CLI</a></li>
          <li><a href="https://platform.openai.com/docs" target="_blank" rel="noopener noreferrer">OpenAI CLI</a></li>
        </ul>
      </div>
    );
  }

  // If only one provider available, optionally hide selector (or show it disabled)
  // For now, we'll always show it for transparency

  return (
    <div className={`provider-buttons ${!visible && 'hidden'}`}>
      {installedProviders.map(provider => (
        <ProviderButton
          key={provider.name}
          label={provider.displayName.replace(' CLI', '')}  // "Gemini" instead of "Gemini CLI"
          providerName={provider.name}
          selected={selected === provider.name}
          version={provider.version}
          onClick={() => onSelect(provider.name)}
        />
      ))}
    </div>
  );
}

export default ProviderSelector;
