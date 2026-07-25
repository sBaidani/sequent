// ErrorBoundary — Phase 4 migration onto the kit (Astryx spec).
// Crash screen: kit Banner (status=error) with a kit Button retry action
// inside a token-styled centered frame. Deliberately dependency-light — kit
// components only, no stores — because it must still render when the rest of
// the app is broken. The font-display lowercase brand heading is kept.
import { ErrorBoundary as SolidErrorBoundary } from 'solid-js';
import { Banner, Button, Heading } from '../kit';

function ErrorBoundary(props) {
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => (
        <div class="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-body p-6 text-primary">
          <Heading level={1} color="accent" justify="center" class="font-display lowercase">
            Something went wrong.
          </Heading>
          <Banner
            status="error"
            title="The application encountered an unexpected error."
            description={String(err)}
            endContent={<Button variant="primary" label="Try Again" onClick={reset} />}
            class="w-full max-w-md text-start"
          />
        </div>
      )}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}

export default ErrorBoundary;
