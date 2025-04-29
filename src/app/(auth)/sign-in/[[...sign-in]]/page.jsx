'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import Image from "next/image";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, '', '/');
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password)
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to Log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background image with overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/loginback.jpg"
          alt="Login background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#2c3e50]/80 backdrop-blur-sm"></div>
      </div>

      <div className="bg-[#2c3e50] shadow-lg rounded-2xl w-full max-w-md p-8 space-y-6 border-2 border-[#2ecc71]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-gray-300 text-sm">
            Log in to continue to Campus Lost and Found
          </p>
        </div>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ecc71] bg-[#34495e] text-white"
              placeholder="Hello@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ecc71] bg-[#34495e] text-white"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2ecc71] text-white py-2 rounded-lg hover:bg-[#27ae60] transition-colors disabled:opacity-60 font-medium"
          >
            {loading ? "Signing In..." : "Log In"}
          </button>
          {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
        </form>
        <p className="text-sm text-center text-gray-300">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-[#2ecc71] hover:underline font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}