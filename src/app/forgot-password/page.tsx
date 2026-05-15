"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-3xl font-black text-white">Forgot Password?</h1>
          <p className="text-zinc-500 mt-2">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        {submitted ? (
          <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 text-center">
            <p className="text-4xl mb-4">📬</p>
            <h2 className="text-white font-bold text-lg mb-2">Check your inbox</h2>
            <p className="text-zinc-400 text-sm">
              If an account exists for{" "}
              <strong className="text-white">{email}</strong>, you&apos;ll
              receive a reset link within a minute.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-[var(--funk-yellow)] hover:underline text-sm"
            >
              ← Back to Login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 flex flex-col gap-5"
          >
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--funk-yellow)] text-black font-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-zinc-500">
              Remembered it?{" "}
              <Link href="/login" className="text-[var(--funk-yellow)] hover:underline">
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
