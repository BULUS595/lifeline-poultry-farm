import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
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

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "red", backgroundColor: "#ffe6e6", height: "100vh" }}>
          <h1>Something went wrong.</h1>
          <h3>{this.state.error?.message}</h3>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
