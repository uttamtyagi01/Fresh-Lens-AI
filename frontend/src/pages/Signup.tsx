import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

interface UserAccount {
  name: string;
  email: string;
  password: string;
}

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    /* ======================================
       VALIDATION
    ====================================== */

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    /* ======================================
       GET EXISTING USERS
    ====================================== */

    let users: UserAccount[] = [];

    try {
      users = JSON.parse(
        localStorage.getItem("freshlens_users") || "[]"
      );
    } catch {
      users = [];
    }

    /* ======================================
       CHECK EXISTING ACCOUNT
    ====================================== */

    const existingUser = users.find(
      (user) => user.email === cleanEmail
    );

    if (existingUser) {
      setError(
        "An account with this email already exists."
      );
      return;
    }

    /* ======================================
       CREATE ACCOUNT
    ====================================== */

    const newUser: UserAccount = {
      name: cleanName,
      email: cleanEmail,
      password,
    };

    const updatedUsers = [
      ...users,
      newUser,
    ];

    localStorage.setItem(
      "freshlens_users",
      JSON.stringify(updatedUsers)
    );

    /* ======================================
       CLEAN OLD AUTH DATA
    ====================================== */

    localStorage.removeItem(
      "freshlens_logged_in"
    );

    localStorage.removeItem(
      "freshlens_user_email"
    );

    /* ======================================
       SUCCESS
    ====================================== */

    setSuccess(
      "Account created successfully! Redirecting to login..."
    );

    /* ======================================
       REDIRECT
    ====================================== */

    setTimeout(() => {
      navigate("/login", {
        replace: true,
      });
    }, 1200);
  };

  return (
    <main className="signup-page">

      <div className="signup-container">

        {/* =================================
            HEADING
        ================================= */}

        <div className="signup-heading">

          <div className="signup-logo">
            🌿
          </div>

          <p className="signup-eyebrow">
            FRESHLENS AI
          </p>

          <h1>
            Create Account
          </h1>

          <p>
            Start using FreshLens AI today
          </p>

        </div>

        {/* =================================
            CARD
        ================================= */}

        <form
          className="signup-card"
          onSubmit={handleSignup}
        >

          {/* NAME */}

          <label>
            Full Name
          </label>

          <div className="signup-input-wrapper">

            <User
              size={18}
              className="signup-input-icon"
            />

            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              autoComplete="name"
            />

          </div>

          {/* EMAIL */}

          <label className="signup-label-spaced">
            Email
          </label>

          <div className="signup-input-wrapper">

            <Mail
              size={18}
              className="signup-input-icon"
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

          <label className="signup-label-spaced">
            Password
          </label>

          <div className="signup-input-wrapper">

            <Lock
              size={18}
              className="signup-input-icon"
            />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Create a password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="new-password"
            />

            <button
              type="button"
              className="signup-password-toggle"
              onClick={() =>
                setShowPassword(
                  (prev) => !prev
                )
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>

          </div>

          {/* CONFIRM PASSWORD */}

          <label className="signup-label-spaced">
            Confirm Password
          </label>

          <div className="signup-input-wrapper">

            <Lock
              size={18}
              className="signup-input-icon"
            />

            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              autoComplete="new-password"
            />

            <button
              type="button"
              className="signup-password-toggle"
              onClick={() =>
                setShowConfirmPassword(
                  (prev) => !prev
                )
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>

          </div>

          {/* ERROR */}

          {error && (
            <div className="signup-error">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="signup-success">
              {success}
            </div>
          )}

          {/* CREATE ACCOUNT */}

          <button
            type="submit"
            className="signup-button"
          >
            Create Account

            <ArrowRight size={18} />
          </button>

          {/* LOGIN */}

          <p className="login-text">

            Already have an account?

            <button
              type="button"
              onClick={() =>
                navigate("/login")
              }
            >
              Login
            </button>

          </p>

          {/* SECURITY */}

          <div className="signup-security">

            <ShieldCheck size={16} />

            <span>
              Your FreshLens account is protected.
            </span>

          </div>

        </form>

      </div>

      <style>{`

        .signup-page {
          min-height: 100vh;

          padding:
            120px 20px 60px;

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

        .signup-container {
          width: 100%;
          max-width: 440px;
        }

        .signup-heading {
          text-align: center;
          margin-bottom: 28px;
        }

        .signup-logo {
          width: 58px;
          height: 58px;

          margin:
            0 auto 15px;

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

        .signup-eyebrow {
          margin:
            0 0 10px;

          color:
            #41e6a1;

          font-size:
            12px;

          font-weight:
            800;

          letter-spacing:
            3px;
        }

        .signup-heading h1 {
          margin: 0;

          font-size:
            42px;

          line-height:
            1.1;
        }

        .signup-heading > p:last-child {
          margin-top:
            13px;

          color:
            #91a1b5;

          font-size:
            14px;
        }

        .signup-card {
          padding:
            30px;

          border-radius:
            22px;

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

        .signup-card label {
          display: block;

          margin-bottom:
            8px;

          color:
            #cbd5e1;

          font-size:
            14px;

          font-weight:
            600;
        }

        .signup-label-spaced {
          margin-top:
            18px;
        }

        .signup-input-wrapper {
          position:
            relative;

          display:
            flex;

          align-items:
            center;
        }

        .signup-input-icon {
          position:
            absolute;

          left:
            14px;

          color:
            #64748b;

          pointer-events:
            none;
        }

        .signup-input-wrapper input {
          width:
            100%;

          box-sizing:
            border-box;

          padding:
            14px 45px 14px 43px;

          border-radius:
            11px;

          border:
            1px solid
            #334155;

          background:
            #050a10;

          color:
            #ffffff;

          font-size:
            15px;

          outline:
            none;

          transition:
            0.2s;
        }

        .signup-input-wrapper input::placeholder {
          color:
            #64748b;
        }

        .signup-input-wrapper input:focus {
          border-color:
            #41e6a1;

          box-shadow:
            0 0 0 3px
            rgba(65, 230, 161, 0.08);
        }

        .signup-password-toggle {
          position:
            absolute;

          right:
            13px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border:
            none;

          background:
            transparent;

          color:
            #64748b;

          cursor:
            pointer;
        }

        .signup-password-toggle:hover {
          color:
            #41e6a1;
        }

        .signup-error {
          margin-top:
            15px;

          padding:
            11px 13px;

          border-radius:
            10px;

          background:
            rgba(255, 80, 70, 0.08);

          border:
            1px solid
            rgba(255, 80, 70, 0.25);

          color:
            #ff8b7b;

          font-size:
            13px;

          line-height:
            1.5;
        }

        .signup-success {
          margin-top:
            15px;

          padding:
            11px 13px;

          border-radius:
            10px;

          background:
            rgba(65, 230, 161, 0.08);

          border:
            1px solid
            rgba(65, 230, 161, 0.25);

          color:
            #41e6a1;

          font-size:
            13px;

          line-height:
            1.5;
        }

        .signup-button {
          width:
            100%;

          margin-top:
            22px;

          padding:
            14px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            8px;

          border:
            none;

          border-radius:
            11px;

          background:
            #24c987;

          color:
            #04120c;

          font-size:
            15px;

          font-weight:
            800;

          cursor:
            pointer;

          transition:
            0.25s;
        }

        .signup-button:hover {
          transform:
            translateY(-2px);

          filter:
            brightness(1.08);

          box-shadow:
            0 10px 30px
            rgba(36, 201, 135, 0.18);
        }

        .login-text {
          margin:
            21px 0 0;

          text-align:
            center;

          color:
            #64748b;

          font-size:
            13px;
        }

        .login-text button {
          margin-left:
            5px;

          border:
            none;

          background:
            transparent;

          color:
            #41e6a1;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .login-text button:hover {
          text-decoration:
            underline;
        }

        .signup-security {
          margin-top:
            18px;

          padding-top:
            16px;

          border-top:
            1px solid
            rgba(100, 130, 170, 0.12);

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            7px;

          color:
            #64748b;

          font-size:
            11px;
        }

        .signup-security svg {
          color:
            #41e6a1;
        }

        @media (max-width: 500px) {

          .signup-page {
            padding-top:
              100px;
          }

          .signup-heading h1 {
            font-size:
              36px;
          }

          .signup-card {
            padding:
              22px;
          }

        }

      `}</style>

    </main>
  );
}