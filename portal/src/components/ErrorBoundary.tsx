import { Component, type ReactNode } from 'react';

import { reportError } from '@/lib/errors';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-full place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold">Something went wrong</h1>
          <p className="mt-2 text-muted">The problem has been reported to the developers.</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-5 h-10 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
