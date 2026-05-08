import React, { useEffect, useState } from "react";
import "./Auth.css";
import { Mail, Lock, Eye, EyeOff, User, BriefcaseBusiness, Compass, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, API_ROOT_URL } from "../services/api";

const Auth = () => {
  const navigate = useNavigate();
  const { login, register, completeOAuthLogin } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [resetMode, setResetMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [resetData, setResetData] = useState({ email: "", otp: "", newPassword: "" });
  const [allowCredentialFill, setAllowCredentialFill] = useState(false);

  const authSignals = [
    { icon: BriefcaseBusiness, label: "Mentor Sessions", value: "320 / week" },
    { icon: Sparkles, label: "Live Projects", value: "Portfolio-ready" },
    { icon: Compass, label: "Guided Flow", value: "Learn, track, improve" },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const redirectTo = params.get("redirect");

    if (!accessToken || !refreshToken) return;

    const oauthUser = {
      id: Number(params.get("id")),
      name: params.get("name"),
      email: params.get("email"),
      role: params.get("role"),
      avatar: params.get("avatar") || "",
      oauth_provider: params.get("oauth_provider") || null,
      notification_email: true,
      notification_push: true,
      created_at: new Date().toISOString(),
    };

    completeOAuthLogin({
      user: oauthUser,
      accessToken,
      refreshToken,
    });

    if (redirectTo && oauthUser.role === "student") navigate(redirectTo, { replace: true });
    else if (oauthUser.role === "admin") navigate("/admin", { replace: true });
    else if (oauthUser.role === "mentor") navigate("/mentor", { replace: true });
    else navigate("/user", { replace: true });
  }, [completeOAuthLogin, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const routeUser = (authenticatedUser) => {
    const redirectTo = new URLSearchParams(window.location.search).get("redirect");
    if (redirectTo && authenticatedUser.role === "student") navigate(redirectTo);
    else if (authenticatedUser.role === "admin") navigate("/admin");
    else if (authenticatedUser.role === "mentor") navigate("/mentor");
    else navigate("/user");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const authenticatedUser = isLogin
        ? await login({ email: formData.email, password: formData.password })
        : await register({ ...formData, role: "student" });

      routeUser(authenticatedUser);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOAuth = (provider) => {
    window.location.href = `${API_ROOT_URL}/api/auth/oauth/${provider}`;
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await api.forgotPassword({ email: resetData.email });
      setOtpSent(true);
      setSuccess(response.message);
    } catch (err) {
      setError(err.message || "Unable to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await api.resendOtp({ email: resetData.email });
      setSuccess(response.message);
    } catch (err) {
      setError(err.message || "Unable to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await api.resetPassword({
        email: resetData.email,
        otp: resetData.otp,
        new_password: resetData.newPassword,
      });
      setSuccess(response.message);
      setResetMode(false);
      setOtpSent(false);
      setIsLogin(true);
      setFormData({ name: "", email: resetData.email, password: "" });
    } catch (err) {
      setError(err.message || "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-left-orb auth-left-orb-one" />
          <div className="auth-left-orb auth-left-orb-two" />

          <div className="auth-left-topline">
            <span className="auth-brand-pill">Lumina LMS</span>
            <span className="auth-brand-note">Future-ready learning network</span>
          </div>

          <div className="auth-left-copy">
            <h1>Ignite your potential.</h1>
            <p>Join the elite network of architects, engineers, and visionaries mastering the next generation.</p>
          </div>

          <div className="auth-left-signals">
            {authSignals.map(({ icon, label, value }) => {
              const SignalIcon = icon;
              return (
              <article key={label}>
                <span className="auth-left-signal-icon"><SignalIcon size={18} /></span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              </article>
              );
            })}
          </div>
        </div>

        <div className="auth-right">
          <div className={`auth-card ${resetMode ? "auth-card-reset" : ""}`}>
            {!resetMode && (
              <div className="auth-toggle">
                <button className={isLogin ? "active" : ""} onClick={() => setIsLogin(true)}>Sign In</button>
                <button className={!isLogin ? "active" : ""} onClick={() => setIsLogin(false)}>Sign Up</button>
              </div>
            )}

            <h2 className="title">{resetMode ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className="sub">
              {resetMode
                ? "Verify your email with OTP and set a new password."
                : isLogin
                  ? "Access your learning pathway and mentors."
                  : "Start your journey with Lumina LMS"}
            </p>

            {!resetMode && (
              <>
                <div className="social">
                  <button className="social-btn" type="button" onClick={() => startOAuth("google")}>
                    <img src="https://cdn-icons-png.flaticon.com/512/281/281764.png" alt="" />
                    Google
                  </button>

                  <button className="social-btn" type="button" onClick={() => startOAuth("facebook")}>
                    <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="" />
                    Facebook
                  </button>
                </div>

                <div className="divider">OR EMAIL</div>
              </>
            )}

            {!resetMode ? (
              <form onSubmit={handleSubmit} autoComplete="off">
                {error && <p className="auth-error">{error}</p>}
                {success && <p className="auth-success">{success}</p>}

                {!isLogin && (
                  <>
                    <label>Full Name</label>
                    <div className="input">
                      <User size={16} />
                      <input type="text" name="name" placeholder="Alex Rivers" onChange={handleChange} required />
                    </div>
                  </>
                )}

                <label>Email Address</label>
                <div className="input">
                  <Mail size={16} />
                  <input
                    type="email"
                    name="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setAllowCredentialFill(true)}
                    readOnly={!allowCredentialFill}
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="label-row">
                  <label>Password</label>
                  {isLogin && <button type="button" className="forgot" onClick={() => setResetMode(true)}>Forgot Password?</button>}
                </div>

                <div className="input">
                  <Lock size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="********"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setAllowCredentialFill(true)}
                    readOnly={!allowCredentialFill}
                    autoComplete="new-password"
                    required
                  />

                  {showPassword ? (
                    <EyeOff onClick={() => setShowPassword(false)} className="eye" />
                  ) : (
                    <Eye onClick={() => setShowPassword(true)} className="eye" />
                  )}
                </div>

                {isLogin && (
                  <div className="checkbox">
                    <input type="checkbox" /> Keep me signed in for 30 days
                  </div>
                )}

                <button type="submit" className="submit-btn">
                  {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
                </button>
              </form>
            ) : (
              <form onSubmit={otpSent ? resetPassword : requestOtp} autoComplete="off">
                {error && <p className="auth-error">{error}</p>}
                {success && <p className="auth-success">{success}</p>}

                <label>Email Address</label>
                <div className="input">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={resetData.email}
                    onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                    onFocus={() => setAllowCredentialFill(true)}
                    readOnly={!allowCredentialFill}
                    autoComplete="off"
                    placeholder="student@example.com"
                    required
                  />
                </div>

                {otpSent && (
                  <>
                    <label>OTP</label>
                    <div className="input">
                      <Lock size={16} />
                      <input
                        value={resetData.otp}
                        onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                        onFocus={() => setAllowCredentialFill(true)}
                        readOnly={!allowCredentialFill}
                        autoComplete="one-time-code"
                        placeholder="Enter 6 digit OTP"
                        required
                      />
                    </div>

                    <label>New Password</label>
                    <div className="input">
                      <Lock size={16} />
                      <input
                        type="password"
                        value={resetData.newPassword}
                        onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                        onFocus={() => setAllowCredentialFill(true)}
                        readOnly={!allowCredentialFill}
                        autoComplete="new-password"
                        placeholder="New password"
                        required
                      />
                    </div>
                  </>
                )}

                <button type="submit" className="submit-btn">
                  {isSubmitting ? "Please wait..." : otpSent ? "Reset Password" : "Send OTP"}
                </button>

                {otpSent && <button type="button" className="link-btn" onClick={resendOtp}>Resend OTP</button>}
                <button type="button" className="link-btn" onClick={() => setResetMode(false)}>Back to sign in</button>
              </form>
            )}

            {!resetMode && (
              <p className="bottom-text">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? " Create an account" : " Sign in"}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
