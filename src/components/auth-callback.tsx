"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message);
          return;
        }
      } else {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (!cancelled) setError(sessionError.message);
          return;
        }

        if (!data.session) {
          if (!cancelled) router.replace("/?verified=1");
          return;
        }
      }

      if (!cancelled) {
        router.replace("/");
      }
    }

    void finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 text-foreground">
      <div className="w-full max-w-md rounded-md border border-border bg-surface p-6 text-center shadow-github-md">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-border bg-canvas">
          {error ? (
            <XCircle aria-hidden="true" className="text-danger" size={24} />
          ) : (
            <Loader2 aria-hidden="true" className="animate-spin text-github-blue" size={24} />
          )}
        </div>

        <h1 className="mt-4 text-lg font-semibold">
          {error ? "Nao foi possivel confirmar o acesso" : "A confirmar acesso"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {error
            ? error
            : "Estamos a validar o link enviado pelo Supabase e a preparar a biblioteca."}
        </p>

        {error ? (
          <Button className="mt-5" onClick={() => router.replace("/")} variant="primary">
            <CheckCircle2 aria-hidden="true" size={16} />
            Voltar ao login
          </Button>
        ) : null}
      </div>
    </main>
  );
}
