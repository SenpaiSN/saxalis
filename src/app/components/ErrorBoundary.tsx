import React from 'react';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // You can log error to a service here
    console.error('Caught error in ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error as Error | undefined;
      const canShowDetails = process.env.NODE_ENV !== 'production';
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Une erreur est survenue dans ce module.</strong>
          <div className="mt-2 text-sm">Veuillez réessayer plus tard ou contacter le support.</div>

          {/* Toggleable details - shown in dev by default, or via button in production */}
          <div className="mt-3">
            {canShowDetails ? (
              <div className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-100 mt-2">
                <div className="font-medium">Détails :</div>
                <div className="mt-1 text-[12px] text-gray-600">{err?.message}</div>
                <pre className="mt-2 text-[11px] text-gray-500">{err?.stack}</pre>
              </div>
            ) : (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-blue-600">Voir les détails</summary>
                <div className="mt-2 text-[12px] text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border border-gray-100">
                  <div className="font-medium">Message :</div>
                  <div className="mt-1">{err?.message}</div>
                  <pre className="mt-2 text-[11px] text-gray-500">{err?.stack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
