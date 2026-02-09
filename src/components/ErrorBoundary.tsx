import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(err: any) { console.error(err); }

  componentDidUpdate(_: Props, prevState: State) {
    // if (!prevState.hasError && this.state.hasError) {
    //   setTimeout(() => {
    //     try { window.location.reload(); } catch {}
    //   }, 2000);
    // }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6">
          <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-lg font-semibold mb-1 text-white">Something went wrong.</h1>
            <p className="text-sm text-white/70 mb-5">Reloading in 2 seconds…</p>
            <button
              onClick={() => { try { window.location.reload(); } catch {} }}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 active:bg-white/20 transition-colors"
            >
              Reload now
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
