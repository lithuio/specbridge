import { AuthForm } from "@/features/auth/auth-form";
export const metadata = { title: "登录" };
export default function Page() {
  return <AuthForm mode="login" />;
}
