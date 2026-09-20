import { LoginPanel } from "@/components/auth/login-panel";
import { Logo } from "@/components/layout/logo";
import { config } from "@/lib/config";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <LoginPanel demoMode={config.demoMode} authMode={config.authMode} />
      </main>
    </div>
  );
}
