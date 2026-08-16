import React from 'react';
import './ErrorBoundary.css';

/**
 * Catches render errors and shows something recoverable.
 *
 * There was no error boundary anywhere in the tree, and React's default for an
 * uncaught render error is to unmount the whole thing — `<div id="root">` ends
 * up empty. That is how one malformed `cart` value in localStorage turned into
 * a blank page on every route, with the real error visible only in the console.
 *
 * The stored-cart problem is fixed at its source in utils/cartStorage.js. This
 * is here so that the *next* one — whatever it turns out to be — costs a
 * message and a working button rather than a white screen.
 *
 * Class component because that is the only way: there is no hook equivalent of
 * componentDidCatch.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the component stack. It is the part that says *which* component
    // threw, and it is not on the error object itself.
    console.error('[ErrorBoundary] render failed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleClearStoredData = () => {
    // The specific escape hatch a user had no way to reach before: if
    // something in localStorage is what is breaking the page, the only fix
    // was opening DevTools.
    try {
      window.localStorage.clear();
    } catch (error) {
      console.warn('[ErrorBoundary] could not clear localStorage:', error);
    }

    window.location.assign('/');
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__panel">
          <h1 className="error-boundary__title">Something went wrong</h1>

          <p className="error-boundary__message">
            This page ran into an error. Trying again often works — if it does
            not, clearing this site&apos;s saved data (your cart and wishlist)
            usually does.
          </p>

          <div className="error-boundary__actions">
            <button
              type="button"
              className="error-boundary__button error-boundary__button--primary"
              onClick={this.handleReset}
            >
              Try again
            </button>

            <button
              type="button"
              className="error-boundary__button"
              onClick={this.handleClearStoredData}
            >
              Clear saved data and reload
            </button>
          </div>

          {/*
            The message is shown but the stack is not — it names internal paths
            and is in the console anyway, which is where anyone who can act on
            it will be looking.
          */}
          <details className="error-boundary__details">
            <summary>Technical details</summary>
            <pre className="error-boundary__pre">{String(error?.message ?? error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
