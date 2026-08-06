import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  // After a successful signup, land the user on the Write surface (home).
  return <AuthForm mode="signup" redirectTo="/" />;
}
