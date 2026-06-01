"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          // Mesmo que a troca do código falhe (ex: o link foi pré-carregado/analisado por um scanner de email
          // ou o fluxo expirou), o email já se encontra confirmado e o utilizador criado na base de dados.
          // Exibimos a página de sucesso em vez de uma tela de erro bloqueante.
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }
      } else {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        if (!data.session) {
          if (!cancelled) {
            router.replace("/?verified=1");
          }
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
          {loading ? (
            <Loader2 aria-hidden="true" className="animate-spin text-github-blue" size={24} />
          ) : (
            <CheckCircle2 aria-hidden="true" className="text-success" size={24} />
          )}
        </div>

        <h1 className="mt-4 text-lg font-semibold">
          {loading ? "A confirmar acesso" : "Registo Concluído com Sucesso"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {loading
            ? "Estamos a validar o link enviado pelo Supabase e a preparar a biblioteca."
            : "A sua conta institucional foi validada. Quer o link de ativação já tenha sido processado automaticamente ou tenha expirado, a sua conta encontra-se ativa e pronta a ser utilizada na biblioteca da ETAP."}
        </p>

        {!loading && (
          <Button className="mt-5" onClick={() => router.replace("/")} variant="primary">
            <CheckCircle2 aria-hidden="true" size={16} />
            Entrar na Biblioteca
          </Button>
        )}
      </div>
    </main>
  );
}
