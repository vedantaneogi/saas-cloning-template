"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRegister } from "../hooks/useAuth";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(12, "Password must be at most 12 characters"),
});

type FormData = z.infer<typeof schema>;

export function SignupForm() {
  const registerMutation = useRegister();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit((data) => {
    registerMutation.mutate(data);
  });

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <h1 className="text-xl font-semibold text-center mb-1" style={{ color: "#1B0A3C" }}>
          Create your free account
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[#1B0A3C] hover:underline font-medium">
            Log In
          </Link>
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#1B0A3C" }}>
              Full Name
            </label>
            <input
              {...register("name")}
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Enter your full name"
              className="w-full px-3 py-2.5 border rounded text-sm outline-none"
              style={{ borderColor: errors.name ? "#D93025" : "#E0E0E0" }}
              onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
              onBlur={(e) => (e.target.style.borderColor = errors.name ? "#D93025" : "#E0E0E0")}
            />
            {errors.name && (
              <p className="mt-1 text-xs" style={{ color: "#D93025" }}>{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#1B0A3C" }}>
              Email Address
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2.5 border rounded text-sm outline-none"
              style={{ borderColor: errors.email ? "#D93025" : "#E0E0E0" }}
              onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
              onBlur={(e) => (e.target.style.borderColor = errors.email ? "#D93025" : "#E0E0E0")}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: "#D93025" }}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#1B0A3C" }}>
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              autoComplete="new-password"
              placeholder="Create a password (min. 8 chars)"
              className="w-full px-3 py-2.5 border rounded text-sm outline-none"
              style={{ borderColor: errors.password ? "#D93025" : "#E0E0E0" }}
              onFocus={(e) => (e.target.style.borderColor = "#1B0A3C")}
              onBlur={(e) => (e.target.style.borderColor = errors.password ? "#D93025" : "#E0E0E0")}
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: "#D93025" }}>{errors.password.message}</p>
            )}
          </div>

          {registerMutation.isError && (
            <div className="p-3 rounded text-sm" style={{ background: "#FFEBEE", color: "#D93025" }}>
              {(registerMutation.error as Error).message}
            </div>
          )}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full py-2.5 rounded text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: "#1B0A3C" }}
            onMouseOver={(e) => { if (!registerMutation.isPending) e.currentTarget.style.background = "#3D00CC"; }}
            onMouseOut={(e) => (e.currentTarget.style.background = "#1B0A3C")}
          >
            {registerMutation.isPending ? "Creating account..." : "CREATE ACCOUNT"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            By creating an account, you agree to our{" "}
            <a href="#" className="underline">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </form>
      </div>

      <div className="mt-8 text-center space-y-3">
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <span>Powered by</span>
          <span className="font-semibold" style={{ color: "#1B0A3C" }}>Docusign</span>
        </div>
        <p className="text-xs text-gray-400">
          Copyright &copy; 2003-2025 Docusign, Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
