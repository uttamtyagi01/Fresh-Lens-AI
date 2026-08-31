import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    const users = JSON.parse(
      localStorage.getItem("freshlens_users") || "[]"
    );

    /*
      If no account exists yet, show signup message.
    */

    if (users.length === 0) {
      setError(
        "No account found. Please create an account first."
      );
      return;
    }

    const user = users.find(
      (item: { email: string; password: string }) =>
        item.email === cleanEmail &&
        item.password === password
    );

    if (!user) {
      setError(
        "Invalid email or password."
      );
      return;
    }

    localStorage.setItem(
      "freshlens_logged_in",
      "true"
    );

    localStorage.setItem(
      "freshlens_user_email",
      cleanEmail
    );

    navigate("/dashboard");
  };

  return (
    <main className="login-page">

      <div className="login-container">

        {/* HEADING */}

        <div className="login-heading">

          <div className="login-logo">
            🌿
          </div>

          <p className="eyebrow">
            FRESHLENS AI
          </p>

          <h1>
            Welcome Back
          </h1>

          <p>
            Login to continue using FreshLens AI
          </p>

        </div>

        {/* CARD */}

        <form
          className="login-card"
          onSubmit={handleLogin}
        >

          {/* EMAIL */}

          <label>
            Email
          </label>

          <div className="login-input-wrapper">

            <Mail
              size={18}
              className="login-input-icon"
            />

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
            />

          </div>

          {/* PASSWORD */}

          <label className="login-label-spaced">
            Password
          </label>

          <div className="login-input-wrapper">

            <Lock
              size={18}
              className="login-input-icon"
            />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
            />

            <button
              type="button"
              className="login-password-toggle"
              onClick={() =>
                setShowPassword((prev) => !prev)
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>

          </div>

          {/* ERROR */}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* LOGIN */}

          <button
            type="submit"
            className="login-button"
          >
            Login

            <ArrowRight size={18} />

          </button>

          {/* SIGN UP */}

          <p className="signup-text">

            Don't have an account?

            <button
              type="button"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>

          </p>

          {/* SECURITY */}

          <div className="login-security">

            <ShieldCheck size={16} />

            <span>
              Your FreshLens account is protected.
            </span>

          </div>

        </form>

      </div>

      <style>{`

        .login-page {
          min-height: 100vh;

          padding: 120px 20px 60px;

          display: flex;
          justify-content: center;

          background:
            radial-gradient(
              circle at 50% 8%,
              rgba(0, 255, 170, 0.09),
              transparent 40%
            ),
            #050a10;

          color: #ffffff;
        }

        .login-container {
          width: 100%;
          max-width: 440px;
        }

        .login-heading {
          text-align: center;

          margin-bottom: 28px;
        }

        .login-logo {
          width: 58px;
          height: 58px;

          margin: 0 auto 15px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 18px;

          background:
            rgba(65, 230, 161, 0.1);

          border:
            1px solid
            rgba(65, 230, 161, 0.2);

          font-size: 30px;

          box-shadow:
            0 0 35px
            rgba(65, 230, 161, 0.08);
        }

        .eyebrow {
          margin: 0 0 10px;

          color: #41e6a1;

          font-size: 12px;
          font-weight: 800;

          letter-spacing: 3px;
        }

        .login-heading h1 {
          margin: 0;

          font-size: 42px;
          line-height: 1.1;
        }

        .login-heading > p:last-child {
          margin-top: 13px;

          color: #91a1b5;

          font-size: 14px;
        }

        .login-card {
          padding: 30px;

          border-radius: 22px;

          background:
            linear-gradient(
              145deg,
              rgba(21, 35, 59, 0.97),
              rgba(7, 14, 25, 0.97)
            );

          border:
            1px solid
            rgba(100, 130, 170, 0.2);

          box-shadow:
            0 25px 70px
            rgba(0, 0, 0, 0.4);
        }

        .login-card label {
          display: block;

          margin-bottom: 8px;

          color: #cbd5e1;

          font-size: 14px;
          font-weight: 600;
        }

        .login-label-spaced {
          margin-top: 20px;
        }

        .login-input-wrapper {
          position: relative;

          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;

          left: 14px;

          color: #64748b;

          pointer-events: none;
        }

        .login-input-wrapper input {
          width: 100%;

          box-sizing: border-box;

          padding: 14px 45px 14px 43px;

          border-radius: 11px;

          border:
            1px solid
            #334155;

          background: #050a10;

          color: #ffffff;

          font-size: 15px;

          outline: none;

          transition: 0.2s;
        }

        .login-input-wrapper input::placeholder {
          color: #64748b;
        }

        .login-input-wrapper input:focus {
          border-color: #41e6a1;

          box-shadow:
            0 0 0 3px
            rgba(65, 230, 161, 0.08);
        }

        .login-password-toggle {
          position: absolute;

          right: 13px;

          display: flex;

          border: none;
          background: transparent;

          color: #64748b;

          cursor: pointer;
        }

        .login-password-toggle:hover {
          color: #41e6a1;
        }

        .login-error {
          margin-top: 15px;

          padding: 11px 13px;

          border-radius: 10px;

          background:
            rgba(255, 80, 70, 0.08);

          border:
            1px solid
            rgba(255, 80, 70, 0.25);

          color: #ff8b7b;

          font-size: 13px;

          line-height: 1.5;
        }

        .login-button {
          width: 100%;

          margin-top: 22px;

          padding: 14px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border: none;
          border-radius: 11px;

          background: #24c987;

          color: #04120c;

          font-size: 15px;
          font-weight: 800;

          cursor: pointer;

          transition: 0.25s;
        }

        .login-button:hover {
          transform: translateY(-2px);

          filter: brightness(1.08);

          box-shadow:
            0 10px 30px
            rgba(36, 201, 135, 0.18);
        }

        .signup-text {
          margin: 21px 0 0;

          text-align: center;

          color: #64748b;

          font-size: 13px;
        }

        .signup-text button {
          margin-left: 5px;

          border: none;
          background: transparent;

          color: #41e6a1;

          font-weight: 700;

          cursor: pointer;
        }

        .signup-text button:hover {
          text-decoration: underline;
        }

        .login-security {
          margin-top: 18px;

          padding-top: 16px;

          border-top:
            1px solid
            rgba(100, 130, 170, 0.12);

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          color: #64748b;

          font-size: 11px;
        }

        .login-security svg {
          color: #41e6a1;
        }

        @media (max-width: 500px) {

          .login-page {
            padding-top: 100px;
          }

          .login-heading h1 {
            font-size: 36px;
          }

          .login-card {
            padding: 22px;
          }

        }

      `}</style>
    </main>
  );
}