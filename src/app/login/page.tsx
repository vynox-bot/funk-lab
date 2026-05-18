"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const next = searchParams.get("next") ?? "/discover";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push(next);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {registered && (
          <div className="mb-6 bg-green-900/20 border border-green-700/40 rounded-xl px-4 py-3 text-green-400 text-sm text-center font-semibold">
            🎉 Account created! Sign in to enter the Lab.
          </div>
        )}
        <div className="text-center mb-8">
          <span className="text-4xl">🎵</span>
          <h1 className="text-3xl font-black text-white mt-2">
            Welcome back to{" "}
            <span className="text-[var(--funk-yellow)]">Funk Lab</span>
          </h1>
          <p className="text-zinc-500 mt-2">Sign in to your account</p>
        </div>

        <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none"
                placeholder="••••••••"
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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            No account?{" "}
            <Link
              href="/register"
              className="text-[var(--funk-yellow)] hover:underline font-semibold"
            >
              Join the Lab
            </Link>
          </p>
          <p className="text-center text-zinc-600 text-sm mt-2">
            <Link href="/forgot-password" className="hover:text-zinc-400 transition-colors">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><div className="w-full max-w-md h-96 bg-[var(--funk-card)] rounded-2xl animate-pulse" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
