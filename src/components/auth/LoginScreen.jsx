import { createSignal } from 'solid-js';
import { authStore } from '../../stores/authStore';

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
    <div class="w-full min-h-screen flex items-center justify-center bg-bg-theme text-text-primary">
      <div class="bg-card p-10 rounded-2xl w-full max-w-[400px] text-center shadow-2xl">
        <h1 class="font-display lowercase mb-6 font-semibold text-2xl">{isSignUp() ? 'Create an Account' : 'Welcome to Sequent'}</h1>
        
        {error() && <div class="text-[#ff4d4f] mb-4 text-sm bg-[#ff4d4f]/10 p-3 rounded-lg border border-[#ff4d4f]/20">{error()}</div>}
        {message() && <div class="text-[#52c41a] mb-4 text-sm bg-[#52c41a]/10 p-3 rounded-lg border border-[#52c41a]/20">{message()}</div>}
        
        <form onSubmit={handleSubmit} class="flex flex-col gap-4 mb-6">
          {isSignUp() && (
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName()} 
              onInput={(e) => setFullName(e.target.value)} 
              class="p-3 rounded-lg border border-border-theme bg-card text-text-primary outline-none focus:border-accent transition-colors"
              required={isSignUp()}
            />
          )}
          <input 
            type="email" 
            placeholder="Email address" 
            value={email()} 
            onInput={(e) => setEmail(e.target.value)} 
            class="p-3 rounded-lg border border-border-theme bg-card text-text-primary outline-none focus:border-accent transition-colors"
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password()} 
            onInput={(e) => setPassword(e.target.value)} 
            class="p-3 rounded-lg border border-border-theme bg-card text-text-primary outline-none focus:border-accent transition-colors"
            required 
          />
          <button type="submit" class="p-3 rounded-lg bg-accent text-text-primary font-semibold border-none cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20">
            {isSignUp() ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div class="mb-6 text-sm text-[#888]">
          {isSignUp() ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp()); setError(''); setMessage(''); }} class="text-accent bg-transparent border-none cursor-pointer p-0 font-semibold hover:underline">
            {isSignUp() ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <div class="my-5 text-text-secondary text-sm flex items-center gap-4 before:content-[''] before:flex-1 before:h-px before:bg-border-theme after:content-[''] after:flex-1 after:h-px after:bg-border-theme">OR CONTINUE WITH</div>

        <div class="flex flex-col gap-3">
          <button onClick={() => handleOAuth('google')} class="p-3 rounded-lg bg-card text-bg-theme font-medium border-none cursor-pointer flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" class="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button onClick={() => handleOAuth('azure')} class="p-3 rounded-lg bg-[#00a4ef] text-text-primary font-medium border-none cursor-pointer flex items-center justify-center gap-2 hover:bg-[#00a4ef]/90 transition-colors">
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-white"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
            Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
