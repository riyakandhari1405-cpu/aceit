import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { redirectIfSignedIn } from "@/lib/guard";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  await redirectIfSignedIn();
  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up your preparation where you left it."
      footer={<>New here? <Link className="text-copper" href="/register">Create a profile</Link></>}
    >
      <LoginForm />
    </AuthShell>
  );
}
