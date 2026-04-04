import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        
        // Handle ChunkLoadError (common with lazy loading and new deployments)
        if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
            const hasReloaded = sessionStorage.getItem('chunk-error-reload');
            if (!hasReloaded) {
                sessionStorage.setItem('chunk-error-reload', 'true');
                window.location.reload();
                return;
            }
        }
        
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-950 text-white font-sans">
                    <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-[2.5rem] p-10 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter mb-4 italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            Something went wrong
                        </h1>
                        <p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">
                            The application encountered an unexpected error. This usually happens after an update or due to a connection issue.
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('chunk-error-reload');
                                    window.location.reload();
                                }}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                            >
                                Reload App
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                            >
                                Return Home
                            </button>
                        </div>

                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <details className="mt-8 text-left bg-black/40 p-4 rounded-xl text-[10px] text-slate-500 border border-white/5 overflow-auto max-h-40">
                                <summary className="cursor-pointer font-bold mb-2 uppercase">Technical Details</summary>
                                {this.state.error.toString()}
                                <br />
                                {this.state.errorInfo?.componentStack}
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
