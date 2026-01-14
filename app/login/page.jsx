"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DistributorLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("role", data.user.role);
        router.push("/board");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              expandico<span className="text-red-500">|</span>One
            </h1>
             <h2 className="text-xl font-semibold text-gray-700 mt-4">
              Welcome to Koop India
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-center mb-6 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* form  */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter Email"
                value={form.email}
                onChange={handleChange}
                className="w-full border text-gray-600 border-gray-500 p-4 rounded-lg"
                required
              />
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={form.password}
                onChange={handleChange}
                className="w-full border text-gray-600 border-gray-600 p-4 rounded-lg pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-600">Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-4 rounded-lg hover:bg-orange-600 transition disabled:bg-orange-300 cursor-pointer font-semibold text-base"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
