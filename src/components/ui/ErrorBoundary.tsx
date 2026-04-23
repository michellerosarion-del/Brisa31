import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isQuota = this.state.error?.message.toLowerCase().includes('quota') || 
                      this.state.error?.message.toLowerCase().includes('resource-exhausted');

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isQuota ? 'Limite de Uso Atingido' : 'Ops! Algo deu errado'}
            </h1>
            
            <p className="text-gray-600 mb-8 text-sm leading-relaxed">
              {isQuota 
                ? 'O limite diário de consultas ao banco de dados foi atingido. O acesso será restaurado automaticamente amanhã. Por favor, tente novamente mais tarde.'
                : 'Ocorreu um erro inesperado ao carregar o sistema. Nossa equipe já foi notificada.'}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-midnight text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
