import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="rounded-xl bg-elevated p-6 shadow-popover">
      <h1 className="text-title3 font-semibold text-text-primary">Create your account</h1>
      <p className="mt-1 text-small text-text-tertiary">Sign up and create your first workspace.</p>
      <SignupForm />
      <p className="mt-5 text-mini text-text-tertiary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
