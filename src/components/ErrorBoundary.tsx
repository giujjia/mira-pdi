import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary capturou uma falha não-tratada:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50/50 border border-red-200 rounded-md text-center max-w-lg mx-auto my-12 space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">warning</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-red-900">Ocorreu um erro inesperado</h2>
            <p className="text-xs text-red-700 mt-1">
              {this.state.error?.message || 'Falha na renderização ou processamento de imagens.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-xs transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
