import { createSignal } from 'solid-js';
import { authStore } from '../../stores/authStore';

function LoginScreen() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const { error: signInError } = await authStore.signInWithEmail(email(), password());
    if (signInError) setError(signInError.message);
  };

  const handleOAuth = async (provider) => {
    setError('');
    const { error: oauthError } = await authStore.signInWithOAuth(provider);
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div class="login-screen" style={{ "min-height": "100vh", "display": "flex", "align-items": "center", "justify-content": "center", "background-color": "#0F0F0F", "color": "#F3F3F3" }}>
      <div class="login-card" style={{ "background-color": "#1A1A1A", "padding": "40px", "border-radius": "16px", "width": "100%", "max-width": "400px", "text-align": "center" }}>
        <h1 style={{ "margin-bottom": "24px", "font-weight": "600" }}>Welcome to Sequent</h1>
        
        {error() && <div class="error-message" style={{ "color": "#ff4d4f", "margin-bottom": "16px" }}>{error()}</div>}
        
        <form onSubmit={handleLogin} style={{ "display": "flex", "flex-direction": "column", "gap": "16px", "margin-bottom": "24px" }}>
          <input 
            type="email" 
            placeholder="Email address" 
            value={email()} 
            onInput={(e) => setEmail(e.target.value)} 
            style={{ "padding": "12px", "border-radius": "8px", "border": "1px solid #333", "background": "#222", "color": "#fff" }}
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password()} 
            onInput={(e) => setPassword(e.target.value)} 
            style={{ "padding": "12px", "border-radius": "8px", "border": "1px solid #333", "background": "#222", "color": "#fff" }}
            required 
          />
          <button type="submit" style={{ "padding": "12px", "border-radius": "8px", "background": "#E8942A", "color": "#fff", "font-weight": "600", "border": "none", "cursor": "pointer" }}>
            Sign In
          </button>
        </form>

        <div style={{ "margin": "20px 0", "color": "#888", "font-size": "14px" }}>OR CONTINUE WITH</div>

        <div style={{ "display": "flex", "gap": "12px", "flex-direction": "column" }}>
          <button onClick={() => handleOAuth('google')} style={{ "padding": "12px", "border-radius": "8px", "background": "#fff", "color": "#000", "font-weight": "500", "border": "none", "cursor": "pointer", "display": "flex", "align-items": "center", "justify-content": "center", "gap": "8px" }}>
            Google
          </button>
          <button onClick={() => handleOAuth('azure')} style={{ "padding": "12px", "border-radius": "8px", "background": "#00a4ef", "color": "#fff", "font-weight": "500", "border": "none", "cursor": "pointer", "display": "flex", "align-items": "center", "justify-content": "center", "gap": "8px" }}>
            Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
