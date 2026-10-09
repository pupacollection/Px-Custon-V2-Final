// PX CUSTOM — Error Boundary Global com Identidade Visual Oficial
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { PxLogo } from './PxLogo';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PX CUSTOM ErrorBoundary caught]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none selection:bg-[#FF1A2D] selection:text-white">
          <div className="max-w-md w-full bg-[#0b0b0b] border border-[#262626] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-red-950/20">
            {/* Logo */}
            <div className="inline-block">
              <PxLogo size="md" />
            </div>

            {/* Warning Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-[#FF1A2D]/50 text-[#FF1A2D] mx-auto flex items-center justify-center shadow-lg shadow-red-950/40">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase font-heading tracking-wide">
                PX CUSTOM
              </h1>
              <p className="text-sm font-semibold text-gray-300">
                Ocorreu um erro inesperado.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Nossa equipe e o sistema de telemetria já registraram o incidente. Você pode recarregar a página para continuar.
              </p>
            </div>

            {/* Diagnóstico em modo de desenvolvimento */}
            {isDev && this.state.error && (
              <div className="text-left bg-[#121212] border border-[#222222] rounded-xl p-3 text-xs space-y-2 max-h-48 overflow-y-auto">
                <div className="font-bold text-red-400 font-mono text-[11px] break-words">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-gray-500 font-mono overflow-x-auto whitespace-pre-wrap leading-tight">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-[#FF1A2D] hover:bg-[#D90014] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar aplicação</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full py-2.5 px-4 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-gray-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Ir para a Página Inicial</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
