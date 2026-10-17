"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type AuthActionState } from "@/app/auth-actions";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath: string;
  notice?: string;
};

const initialState: AuthActionState = {};

export function AuthForm({ mode, nextPath, notice }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [state, formAction, isPending] = useActionState(
    isSignup ? signUpAction : signInAction,
    initialState,
  );

  return (
    <section className="account-panel">
      <span className="eyebrow">{isSignup ? "Create your account" : "Welcome back"}</span>
      <h1>{isSignup ? "A more considered next step." : "Pick up where you left off."}</h1>
      <p>
        {isSignup
          ? "Create a Proofline account to keep your resume work in one place."
          : "Sign in to return to your resume workspace."}
      </p>
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      <form className="auth-form" action={formAction}>
        <input type="hidden" name="next" value={nextPath} />
        {isSignup && (
          <label>
            Name <span>Optional</span>
            <input autoComplete="name" maxLength={80} name="fullName" />
          </label>
        )}
        <label>
          Email address
          <input
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            maxLength={254}
            name="email"
            type="email"
            inputMode="email"
            aria-describedby={state.error ? "auth-error" : undefined}
            aria-invalid={Boolean(state.error)}
          />
        </label>
        <label>
          Password
          {isSignup && <span>At least 8 characters</span>}
          <input
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            name="password"
            type="password"
            aria-describedby={state.error ? "auth-error" : undefined}
            aria-invalid={Boolean(state.error)}
          />
        </label>
        {isSignup && (
          <label>
            Confirm password
            <input
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              name="passwordConfirmation"
              type="password"
              aria-describedby={state.error ? "auth-error" : undefined}
              aria-invalid={Boolean(state.error)}
            />
          </label>
        )}
        {state.error && <p className="form-feedback error" id="auth-error" role="alert">{state.error}</p>}
        {state.success && <p className="form-feedback success" role="status">{state.success}</p>}
        <button className="button button-dark" disabled={isPending} type="submit">
          {isPending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <Link className="button button-outline" style={{ width: "100%", display: "inline-block" }} href={nextPath}>
            Instant Demo Access (Skip sign-in) →
          </Link>
        </div>
      </form>
      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to Proofline?"}{" "}
        <Link href={isSignup ? `/login?next=${encodeURIComponent(nextPath)}` : "/sign-up"}>
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}