import { Suspense } from "react";
import { AuthCallback } from "@/components/auth-callback";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallback />
    </Suspense>
  );
}

function CallbackFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 text-foreground">
      <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
        A confirmar acesso...
      </div>
    </main>
  );
}
