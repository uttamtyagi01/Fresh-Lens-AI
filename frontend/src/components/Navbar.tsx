type NavbarProps = {
  onLogin: () => void;
  onHome: () => void;
  onDashboard: () => void;
};

function Navbar({
  onLogin,
  onHome,
  onDashboard,
}: NavbarProps) {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <button
          type="button"
          onClick={onHome}
          className="text-xl font-bold text-white transition hover:text-emerald-400"
        >
          FreshLens AI
        </button>

        {/* Navigation */}
        <div className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">

          <button
            type="button"
            onClick={onHome}
            className="transition hover:text-emerald-400"
          >
            Home
          </button>

          <button
            type="button"
            onClick={onDashboard}
            className="transition hover:text-emerald-400"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={onHome}
            className="transition hover:text-emerald-400"
          >
            Features
          </button>

          <button
            type="button"
            onClick={onHome}
            className="transition hover:text-emerald-400"
          >
            How It Works
          </button>

          <button
            type="button"
            onClick={onHome}
            className="transition hover:text-emerald-400"
          >
            Technology
          </button>

        </div>

        {/* Login */}
        <button
          type="button"
          onClick={onLogin}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400"
        >
          Login
        </button>

      </div>
    </nav>
  );
}

export default Navbar;