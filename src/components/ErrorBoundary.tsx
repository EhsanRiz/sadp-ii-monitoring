/**
 * Top-level error boundary.
 *
 * Without this, any uncaught render error white-screens the whole PWA — which
 * is especially bad on a field tablet with no devtools and possibly no signal.
 * This catches the error, keeps the shell alive, and offers a Reload action.
 * It deliberately does NOT clear caches or the offline queue, so unsynced
 * field data survives the crash.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to the console for debugging; a future hook could ship this to a
    // logging endpoint. Kept minimal so the boundary itself can't throw.
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center space-y-4 shadow-sm">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. Your saved and queued work is safe on this device.
              Reloading usually fixes it — if it keeps happening, note what you were doing and tell
              the SADP team.
            </p>
            <pre className="text-left text-[11px] text-muted-foreground/80 bg-muted rounded p-2 overflow-x-auto max-h-32">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reload the app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
