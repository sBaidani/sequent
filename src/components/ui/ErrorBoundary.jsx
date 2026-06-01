import { ErrorBoundary as SolidErrorBoundary } from 'solid-js';

function ErrorBoundary(props) {
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => (
        <div class="flex flex-col items-center justify-center h-screen w-screen bg-[#0F0F0F] text-white text-center p-5">
          <div class="text-5xl mb-4">⚠️</div>
          <h2 class="mb-3 text-accent">Something went wrong.</h2>
          <p class="text-[#888] mb-6 max-w-[400px]">
            The application encountered an unexpected error.
            <br/><br/>
            {err.toString()}
          </p>
          <button 
            onClick={reset}
            class="px-6 py-3 rounded-lg bg-accent text-white font-semibold border-none cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
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
