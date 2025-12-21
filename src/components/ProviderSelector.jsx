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
 * - loading: Whether providers are being detected
 */
function ProviderSelector({ availableProviders, selected, onSelect, visible, loading }) {
  // Show loading state while detecting providers
  if (loading) {
    return (
      <div className={`provider-buttons ${!visible && 'hidden'}`}>
        <div className="provider-loading">Leder efter providers...</div>
      </div>
    );
  }

  // Filter to only show available providers
  const installedProviders = availableProviders.filter(p => p.available);

  // If no providers available, return null (error overlay handles this)
  if (installedProviders.length === 0) {
    return null;
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
