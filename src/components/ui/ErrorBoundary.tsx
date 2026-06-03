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
                      this.state.error?.message.toLowerCase().includes('resource-exhausted') ||
                      this.state.error?.message.toLowerCase().includes('resource_exhausted');

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 sm:p-10 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100/50">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            
            <h1 className="text-lg sm:text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">
              {isQuota ? 'Limite de Armazenamento/Leitura Excedido' : 'Ops! Algo deu errado'}
            </h1>
            
            <p className="text-slate-600 mb-6 text-sm leading-relaxed font-medium">
              {isQuota 
                ? 'Sua base de dados do Firebase atingiu o limite de cota gratuita diária (Spark Plan) para leitura de dados. O limite será redefinido automaticamente amanhã.'
                : 'Ocorreu um erro inesperado ao carregar o sistema. Por favor, tente recarregar.'}
            </p>

            {isQuota && (
              <div className="mb-8 p-4 bg-amber-50 rounded-xl border border-amber-100 text-left space-y-3">
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Informações Importantes:</p>
                <p className="text-xs leading-relaxed text-amber-700 font-bold">
                  As cotas do Cloud Firestore sob o plano Spark (gratuito) são limitadas a <span className="underline">50.000 leituras por dia</span>. 
                  Para restaurar o acesso imediato e evitar interrupções, você pode ativar o faturamento ou verificar sua cota no console do Firebase.
                </p>
                <div className="pt-2 text-center">
                  <a 
                    href="https://console.firebase.google.com/project/gen-lang-client-0238185019/firestore/databases/ai-studio-e80e99fc-359b-4ee2-9909-399265ced653/data?openUpgradeDialog=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-white border border-slate-350 hover:bg-slate-50 transition-all px-4 py-2 rounded-lg shadow-sm"
                  >
                    Fazer Upgrade de Cota no Firebase ↗
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
