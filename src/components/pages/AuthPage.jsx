import { useState } from "react";
import { navigateTo } from "../../app/useRoute";
import { useAuth } from "../../contexts/AuthContext";
import {
  isValidUsername,
  normalizeUsername,
} from "../../services/profileService";
import { BrandBadge } from "../layout/BrandBadge";
import { ThemeToggle } from "../layout/ThemeToggle";

export function AuthPage() {
  const { authError, isConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!isConfigured) {
      setFormError("App configuration is missing.");
      return;
    }

    const loginValue = loginIdentifier.trim();
    const emailValue = signupEmail.trim();

    if (mode === "signup" && (!username.trim() || !emailValue || !password)) {
      setFormError("Enter your username, email, and password.");
      return;
    }

    if (mode === "login" && (!loginValue || !password)) {
      setFormError("Enter your email or username and password.");
      return;
    }

    if (mode === "signup" && !isValidUsername(username)) {
      setFormError(
        "Use a username with 3-24 letters, numbers, or underscores.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const result = await signUp(emailValue, password, username);

        if (result?.needsEmailConfirmation) {
          setSuccessMessage(
            "Account created. Check your email to confirm it, then log in.",
          );
          setMode("login");
          setLoginIdentifier(emailValue);
          setSignupEmail("");
          setUsername("");
          setPassword("");
        } else {
          navigateTo("/board", { replace: true });
        }
      } else {
        await signIn(loginValue, password);
        navigateTo("/board", { replace: true });
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandBadge />
          <ThemeToggle />
        </div>

        <section className="panel mx-auto w-full max-w-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="pill">Account</span>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl">
            {mode === "signup"
              ? "Create your C Board account"
              : "Sign in to C Board"}
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            {mode === "signup" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                  Username
                </span>
                <input
                  className="field-input"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) =>
                    setUsername(normalizeUsername(event.target.value))
                  }
                  placeholder="username"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                {mode === "signup" ? "Email" : "Email or username"}
              </span>
              <input
                className="field-input"
                type={mode === "signup" ? "email" : "text"}
                autoComplete={mode === "signup" ? "email" : "username"}
                value={mode === "signup" ? signupEmail : loginIdentifier}
                onChange={(event) => {
                  if (mode === "signup") {
                    setSignupEmail(event.target.value);
                    return;
                  }

                  setLoginIdentifier(event.target.value);
                }}
                placeholder={
                  mode === "signup"
                    ? "you@example.com"
                    : "you@example.com or username"
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-black/70">
                Password
              </span>
              <div className="relative">
                <input
                  className="field-input pr-14"
                  type={isPasswordVisible ? "text" : "password"}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  aria-pressed={isPasswordVisible}
                  className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_#000] transition hover:translate-x-[1px] hover:shadow-[1px_1px_0_#000]"
                >
                  {isPasswordVisible ? (
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.5 5.5A10.6 10.6 0 0 1 12 5c5 0 8.5 4.5 9.5 7a12.2 12.2 0 0 1-3.1 4.3" />
                      <path d="M6.6 6.6A12 12 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a10.9 10.9 0 0 0 4-.8" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 12c1-2.5 4.5-7 9.5-7s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7s-8.5-4.5-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {formError || authError ? (
              <p className="rounded-[1rem] border-2 border-black bg-[#ffe0de] px-4 py-3 text-sm font-bold text-black">
                {formError || authError}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-[1rem] border-2 border-black bg-[#d9ff9f] px-4 py-3 text-sm font-bold text-black">
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-black bg-[#c5ff6f] px-5 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting
                ? "Working..."
                : mode === "signup"
                  ? "Sign up"
                  : "Login"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((currentMode) =>
                currentMode === "signup" ? "login" : "signup",
              );
              setFormError("");
              setSuccessMessage("");
              setPassword("");
              setIsPasswordVisible(false);
            }}
            className="mt-5 text-sm font-bold text-black underline decoration-2 underline-offset-4"
          >
            {mode === "signup"
              ? "Already have an account? Login"
              : "Need an account? Sign up"}
          </button>
        </section>
      </div>
    </main>
  );
}
