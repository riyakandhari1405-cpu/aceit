import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { redirectIfSignedIn } from "@/lib/guard";

export const metadata = { title: "Create profile" };

export default async function RegisterPage() {
  await redirectIfSignedIn();
  return (
    <AuthShell
      title="Create your profile"
      subtitle="Start with your name. The rest of the profile can be filled in after."
      footer={<>Already have an account? <Link className="text-copper" href="/login">Sign in</Link></>}
    >
      <RegisterForm />
    </AuthShell>
  );
}
