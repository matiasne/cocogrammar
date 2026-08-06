import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  // After a successful login, land the user on the Write surface (home).
  return <AuthForm mode="login" redirectTo="/" />;
}
