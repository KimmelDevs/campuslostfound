'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth"; // We only need signUp now
import Link from "next/link";
import Image from "next/image";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validation checks
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    setLoading(true);

    try {
      // This now handles everything: auth creation, profile update, and Firestore doc
      await signUp(email, password, username);
      
      // Redirect to dashboard after successful signup
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
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
          <h2 className="text-3xl font-bold text-white">Create an Account</h2>
          <p className="text-gray-300 text-sm">Join Campus Lost and Found today</p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ecc71] bg-[#34495e] text-white"
              placeholder="Kimmel Delector"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ecc71] bg-[#34495e] text-white"
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ecc71] bg-[#34495e] text-white"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ecc71] bg-[#34495e] text-white"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2ecc71] text-white py-2 rounded-lg hover:bg-[#27ae60] transition-colors disabled:opacity-60 font-medium"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-300">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[#2ecc71] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}