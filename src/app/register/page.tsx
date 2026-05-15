"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
    } else {
      router.push("/login?registered=1");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🎤</span>
          <h1 className="text-3xl font-black text-white mt-2">
            Join <span className="text-[var(--funk-yellow)]">Funk Lab</span>
          </h1>
          <p className="text-zinc-500 mt-2">Create your free account</p>
        </div>

        <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Artist Name
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none"
                placeholder="crovenn6"
              />
            </div>

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
                placeholder="name@domain.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
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
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--funk-yellow)] hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
