// LoginScreen — Phase 4 migration onto the kit (Astryx spec).
// Retired here: raw <input>s with placeholder-as-label (kit TextInput with real
// labels; placeholders kept as hints), the hand-rolled submit/OAuth <button>s
// (kit Button), and the raw-hex error/success boxes (kit Banner). Centered
// token layout; authStore contract (signUpWithEmail / signInWithEmail /
// signInWithOAuth) is unchanged. Brand heading stays in the display font via
// kit Heading (theme heading font) + lowercase.
import { createSignal, Show } from 'solid-js';
import { authStore } from '../../stores/authStore';
import { Banner, Button, Heading, Text, TextInput } from '../kit';

// Brand artwork: the Google "G" keeps its official logo colors (logo fill, not
// UI styling — UI colors on this screen are all token-backed).
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" class="size-5 fill-current" aria-hidden="true">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
  </svg>
);

function LoginScreen() {
  const [fullName, setFullName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [isSignUp, setIsSignUp] = createSignal(false);
  const [message, setMessage] = createSignal('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isSignUp()) {
      if (password().length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (!fullName().trim()) {
        setError('Full Name is required.');
        return;
      }
      const { error: signUpError } = await authStore.signUpWithEmail(email(), password(), fullName());
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage('Sign up successful! Please check your email for a confirmation link.');
      }
    } else {
      const { error: signInError } = await authStore.signInWithEmail(email(), password());
      if (signInError) setError(signInError.message);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    const { error: oauthError } = await authStore.signInWithOAuth(provider);
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div class="flex min-h-screen w-full items-center justify-center bg-body p-4 text-primary">
      <div class="flex w-full max-w-sm flex-col gap-6 rounded-lg bg-card p-8 shadow-lg">
        <Heading level={1} justify="center" class="font-display lowercase">
          {isSignUp() ? 'Create an Account' : 'Welcome to Sequent'}
        </Heading>

        <Show when={error()}>
          <Banner status="error" title={error()} />
        </Show>
        <Show when={message()}>
          <Banner status="success" title={message()} />
        </Show>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <Show when={isSignUp()}>
            <TextInput
              label="Full Name"
              type="text"
              value={fullName()}
              onChange={(value) => setFullName(value)}
              placeholder="Full Name"
              autocomplete="name"
              isRequired
              required
            />
          </Show>
          <TextInput
            label="Email address"
            type="email"
            value={email()}
            onChange={(value) => setEmail(value)}
            placeholder="Email address"
            autocomplete="email"
            isRequired
            required
          />
          <TextInput
            label="Password"
            type="password"
            value={password()}
            onChange={(value) => setPassword(value)}
            placeholder="Password"
            autocomplete={isSignUp() ? 'new-password' : 'current-password'}
            isRequired
            required
          />
          <Button
            type="submit"
            variant="primary"
            label={isSignUp() ? 'Sign Up' : 'Sign In'}
            class="mt-2 w-full"
          />
        </form>

        <div class="flex items-center justify-center gap-1">
          <Text type="supporting">
            {isSignUp() ? 'Already have an account?' : "Don't have an account?"}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            label={isSignUp() ? 'Sign In' : 'Sign Up'}
            class="text-accent"
            onClick={() => {
              setIsSignUp(!isSignUp());
              setError('');
              setMessage('');
            }}
          />
        </div>

        <div
          class="flex items-center gap-4 before:h-px before:flex-1 before:bg-border before:content-[''] after:h-px after:flex-1 after:bg-border after:content-['']"
          role="separator"
          aria-label="Or continue with"
        >
          <Text type="supporting">OR CONTINUE WITH</Text>
        </div>

        <div class="flex flex-col gap-3">
          <Button
            variant="secondary"
            label="Google"
            icon={<GoogleLogo />}
            class="w-full"
            onClick={() => handleOAuth('google')}
          />
          <Button
            variant="secondary"
            label="Microsoft"
            icon={<MicrosoftLogo />}
            class="w-full"
            onClick={() => handleOAuth('azure')}
          />
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
