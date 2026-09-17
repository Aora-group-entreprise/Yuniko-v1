import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Yuniko runtime error", error, errorInfo);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="phase10-error-boundary" role="alert">
        <div className="phase10-error-boundary__card">
          <h1>Yuniko a rencontré un problème.</h1>
          <p>La page n’a pas pu être affichée correctement. Recharge l’application pour réessayer.</p>
          <button type="button" className="phase10-error-boundary__button" onClick={this.handleRetry}>
            Réessayer
          </button>
        </div>
      </main>
    );
  }
}
