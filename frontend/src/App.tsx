import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Scan from "./pages/Scan";
import Dashboard from "./pages/Dashboard";
import Result from "./pages/Result";

/* =========================================
   AUTH HELPER
========================================= */

function isLoggedIn() {
  return (
    localStorage.getItem("freshlens_logged_in") === "true"
  );
}

/* =========================================
   NAVBAR
========================================= */

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const loggedIn = isLoggedIn();

  const goTo = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  /* =======================================
     LOGOUT
  ======================================= */

  const handleLogout = () => {
    localStorage.removeItem("freshlens_logged_in");
    localStorage.removeItem("freshlens_user_email");

    navigate("/login", {
      replace: true,
    });
  };

  /* =======================================
     SCAN
  ======================================= */

  const handleScan = () => {
    if (isLoggedIn()) {
      navigate("/scan");
    } else {
      navigate("/login");
    }
  };

  /* =======================================
     SECTION SCROLL
  ======================================= */

  const scrollToSection = (id: string) => {
    if (location.pathname !== "/") {
      navigate(`/#${id}`);

      setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);

      return;
    }

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <nav className="app-navbar">

      {/* LOGO */}

      <div
        className="nav-logo"
        onClick={() => goTo("/")}
      >
        <span className="logo-icon">
          🌿
        </span>

        <span>
          FreshLens AI
        </span>
      </div>

      {/* CENTER LINKS */}

      <div className="nav-links">

        <button
          className={
            isActive("/")
              ? "active"
              : ""
          }
          onClick={() => goTo("/")}
        >
          Home
        </button>

        <button
          onClick={() =>
            scrollToSection("features")
          }
        >
          Features
        </button>

        <button
          onClick={() =>
            scrollToSection("how-it-works")
          }
        >
          How It Works
        </button>

        {loggedIn && (
          <button
            className={
              isActive("/dashboard")
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("/dashboard")
            }
          >
            Dashboard
          </button>
        )}

      </div>

      {/* RIGHT ACTIONS */}

      <div className="nav-actions">

        {loggedIn ? (
          <>
            <button
              className="login-nav-button"
              onClick={handleLogout}
            >
              Logout
            </button>

            <button
              className="scan-nav-button"
              onClick={handleScan}
            >
              Scan Food
            </button>
          </>
        ) : (
          <>
            <button
              className="login-nav-button"
              onClick={() =>
                goTo("/login")
              }
            >
              Login
            </button>

            <button
              className="scan-nav-button"
              onClick={handleScan}
            >
              Scan Food
            </button>
          </>
        )}

      </div>

    </nav>
  );
}

/* =========================================
   PROTECTED ROUTE
========================================= */

function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <>{children}</>;
}

/* =========================================
   AUTH ROUTE
========================================= */

function AuthRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isLoggedIn()) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <>{children}</>;
}

/* =========================================
   ROUTES
========================================= */

function AppRoutes() {
  return (
    <>
      <Navbar />

      <Routes>

        {/* HOME */}

        <Route
          path="/"
          element={
            <Landing />
          }
        />

        {/* LOGIN */}

        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />

        {/* SIGNUP */}

        <Route
          path="/signup"
          element={
            <AuthRoute>
              <Signup />
            </AuthRoute>
          }
        />

        {/* SCAN */}

        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Scan />
            </ProtectedRoute>
          }
        />

        {/* DASHBOARD */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* RESULT */}

        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
        />

        {/* UNKNOWN */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

      {/* NAVBAR CSS */}

      <style>{`

        .app-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;

          height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 6%;

          background:
            rgba(5, 10, 16, 0.94);

          border-bottom:
            1px solid
            rgba(100, 130, 170, 0.18);

          backdrop-filter:
            blur(18px);

          -webkit-backdrop-filter:
            blur(18px);
        }

        .nav-logo {
          display: flex;
          align-items: center;

          gap: 9px;

          color: #ffffff;

          font-size: 20px;
          font-weight: 800;

          cursor: pointer;

          white-space: nowrap;

          transition:
            transform 0.2s ease;
        }

        .nav-logo:hover {
          transform:
            translateY(-1px);
        }

        .logo-icon {
          font-size: 24px;
        }

        .nav-links {
          display: flex;
          align-items: center;

          gap: 28px;
        }

        .nav-links button {
          border: none;

          background: transparent;

          color: #91a1b5;

          font-size: 14px;
          font-weight: 600;

          cursor: pointer;

          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .nav-links button:hover {
          color: #41e6a1;

          transform:
            translateY(-1px);
        }

        .nav-links button.active {
          color: #41e6a1;
        }

        .nav-actions {
          display: flex;
          align-items: center;

          gap: 12px;
        }

        .login-nav-button {
          padding:
            10px 18px;

          border:
            1px solid
            rgba(100, 130, 170, 0.35);

          border-radius: 10px;

          background:
            transparent;

          color:
            #ffffff;

          font-size:
            14px;

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            border-color 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease,
            background 0.2s ease;
        }

        .login-nav-button:hover {
          border-color:
            #41e6a1;

          color:
            #41e6a1;

          background:
            rgba(65, 230, 161, 0.05);

          transform:
            translateY(-1px);
        }

        .scan-nav-button {
          padding:
            11px 18px;

          border:
            none;

          border-radius:
            10px;

          background:
            #24c987;

          color:
            #04120c;

          font-size:
            14px;

          font-weight:
            800;

          cursor:
            pointer;

          transition:
            transform 0.2s ease,
            filter 0.2s ease,
            box-shadow 0.2s ease;
        }

        .scan-nav-button:hover {
          transform:
            translateY(-2px);

          filter:
            brightness(1.08);

          box-shadow:
            0 8px 25px
            rgba(36, 201, 135, 0.18);
        }

        .scan-nav-button:active {
          transform:
            translateY(0);
        }

        @media (max-width: 900px) {

          .app-navbar {
            padding:
              0 20px;
          }

          .nav-links {
            gap:
              14px;
          }

        }

        @media (max-width: 700px) {

          .app-navbar {
            height:
              auto;

            min-height:
              70px;

            flex-wrap:
              wrap;

            padding:
              12px 18px;

            gap:
              12px;
          }

          .nav-links {
            order:
              3;

            width:
              100%;

            justify-content:
              center;

            padding-bottom:
              4px;
          }

          .nav-actions {
            margin-left:
              auto;
          }

        }

        @media (max-width: 480px) {

          .nav-logo {
            font-size:
              17px;
          }

          .logo-icon {
            font-size:
              21px;
          }

          .nav-links {
            gap:
              10px;
          }

          .nav-links button {
            font-size:
              11px;
          }

          .login-nav-button {
            padding:
              8px 12px;

            font-size:
              12px;
          }

          .scan-nav-button {
            padding:
              9px 12px;

            font-size:
              12px;
          }

        }

      `}</style>
    </>
  );
}

/* =========================================
   APP
========================================= */

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;