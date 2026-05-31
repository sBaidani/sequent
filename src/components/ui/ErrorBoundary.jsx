import { ErrorBoundary as SolidErrorBoundary } from 'solid-js';

function ErrorBoundary(props) {
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => (
        <div style={{
          "display": "flex",
          "flex-direction": "column",
          "align-items": "center",
          "justify-content": "center",
          "height": "100vh",
          "width": "100vw",
          "background": "#0F0F0F",
          "color": "#fff",
          "text-align": "center",
          "padding": "20px"
        }}>
          <div style={{ "font-size": "48px", "margin-bottom": "16px" }}>⚠️</div>
          <h2 style={{ "margin-bottom": "12px", "color": "#E8942A" }}>Something went wrong.</h2>
          <p style={{ "color": "#888", "margin-bottom": "24px", "max-width": "400px" }}>
            The application encountered an unexpected error.
            <br/><br/>
            {err.toString()}
          </p>
          <button 
            onClick={reset}
            style={{
              "padding": "12px 24px", "border-radius": "8px",
              "background": "#E8942A", "color": "#fff", "font-weight": "600",
              "border": "none", "cursor": "pointer"
            }}
          >
            Try Again
          </button>
        </div>
      )}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

export default ErrorBoundary;
