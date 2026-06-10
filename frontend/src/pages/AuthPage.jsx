const apiBaseUrl = 'https://neolix-neolix-backend.hf.space/api/v1';

export default function AuthPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${apiBaseUrl}/auth/google/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 w-full max-w-sm shadow-2xl text-center space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Neolix Hub</h1>
          <p className="text-sm text-slate-400 mt-1">Autonomous Omnichannel Outreach</p>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl py-3 px-4 transition-all shadow-sm text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-7.9 19.6-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-[11px] text-slate-500">Your data stays private. No passwords stored.</p>
      </div>
    </div>
  );
}