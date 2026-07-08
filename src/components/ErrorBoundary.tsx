import React from 'react';
import i18n from '../i18n';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;
    if (hasError) {
      return (
        <div className="aurora-surface min-h-screen w-full flex items-center justify-center p-6">
          <div className="liquid-glass liquid-glass--strong text-center rounded-xl p-8 max-w-md w-full">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-lg font-semibold mb-1 text-white">{i18n.t('common.errorBoundary.title')}</h1>
            <p className="text-sm text-white/70 mb-5">{i18n.t('common.errorBoundary.reloading')}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-btn bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 active:bg-white/20 transition-colors"
            >
              {i18n.t('common.errorBoundary.reloadNow')}
            </button>
          </div>
        </div>
      );
    }
    return children;
  }
}
