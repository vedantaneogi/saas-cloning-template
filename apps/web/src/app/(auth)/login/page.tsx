import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="rounded-xl bg-elevated p-6 shadow-popover">
      <h1 className="text-title3 font-semibold text-text-primary">Sign in</h1>
      <p className="mt-1 text-small text-text-tertiary">Welcome back. Enter your account credentials.</p>
      <LoginForm />
      <p className="mt-5 text-mini text-text-tertiary">
        New to Linear clone?{" "}
        <Link href="/signup" className="text-accent hover:underline">Create an account</Link>
      </p>
      <p className="mt-2 text-mini text-text-quaternary">
        Demo accounts (password <code className="rounded-sm bg-pill px-1">demo</code>): <code className="font-mono">nm@example.com</code>, <code className="font-mono">ap@example.com</code>, <code className="font-mono">sr@example.com</code>
      </p>
    </div>
  );
}
