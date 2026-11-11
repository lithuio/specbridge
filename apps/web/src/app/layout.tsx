import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SpecBridge · 让每一次确认都有记录",
    template: "%s · SpecBridge",
  },
  description:
    "把需求说清，把每一次确认留住。面向团队与客户的需求、变更确认和交付验收协作。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
