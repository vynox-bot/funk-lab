"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 text-center">
        <p className="text-zinc-400">Invalid or missing reset link.</p>
        <Link
          href="/forgot-password"
          className="text-[var(--funk-yellow)] hover:underline mt-4 inline-block"
        >
          Request a new one →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-white font-bold text-lg mb-2">Password updated!</h2>
        <p className="text-zinc-400 text-sm">
          You can now log in with your new password.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 px-6 py-2.5 bg-[var(--funk-yellow)] text-black font-bold rounded-xl hover:brightness-110 transition-all"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      setSuccess(true);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 flex flex-col gap-5"
    >
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
          New Password
        </label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
          Confirm Password
        </label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Same password again"
          className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[var(--funk-yellow)] text-black font-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Updating…" : "Set New Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-black text-white">Set New Password</h1>
          <p className="text-zinc-500 mt-2">
            Choose a strong password for your account
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-64 bg-[var(--funk-card)] rounded-2xl animate-pulse" />
          }
        >
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
