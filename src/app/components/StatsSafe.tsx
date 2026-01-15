import React from 'react';
import StatsRebuilt from './StatsRebuilt';

interface Props {
  // same props as StatsRebuilt (loose typed to avoid duplication)
  [k: string]: any;
}

interface State {
  hasError: boolean;
  error?: Error | null;
  resetKey: number;
}

export default class StatsSafe extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // log to console for debugging (can be extended to send telemetry)
    console.error('StatsRebuilt render error:', error, info);
  }

  retry = () => {
    this.setState({ hasError: false, error: null, resetKey: this.state.resetKey + 1 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Erreur de chargement des statistiques</h2>
            <p className="mt-2 text-sm text-gray-600">Impossible d'afficher les statistiques sur cet appareil. Vous pouvez réessayer ou consulter la version bureau.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={this.retry} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm">Réessayer</button>
            </div>
          </div>
        </div>
      );
    }

    // Use a key to force remount when retrying
    return <StatsRebuilt key={this.state.resetKey} {...this.props} />;
  }
}
