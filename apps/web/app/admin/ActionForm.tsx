"use client";
import { useActionState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * Formulário do painel que não perde o que foi digitado quando o servidor recusa.
 * A action devolve { error } (mostrado no topo) ou redireciona no sucesso. React limpa o formulário depois de
 * toda submissão; aqui os valores enviados são devolvidos aos campos quando vem erro. A mensagem aparece no topo
 * (lida por leitores de tela) e repetida no fim, perto do botão.
 */
export function ActionForm({ action, children, className, style }: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [state, run] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const sent = useRef<FormData | null>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const form = ref.current;
    const data = sent.current;
    if (!state || !form || !data) return;
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue;
      if (!el.name || el.matches(":disabled")) continue;
      if (el instanceof HTMLInputElement) {
        if (["file", "hidden", "submit", "button", "password"].includes(el.type)) continue;
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = data.getAll(el.name).includes(el.value);
          continue;
        }
      }
      const v = data.get(el.name);
      if (typeof v === "string") el.value = v;
    }
    // Leva até a mensagem: em formulários longos ela fica fora da tela, perto do topo.
    errRef.current?.focus({ preventScroll: true });
    errRef.current?.scrollIntoView({ block: "center" });
  }, [state]);

  return (
    <form ref={ref} action={run} className={className} style={style} onSubmit={(e) => { sent.current = new FormData(e.currentTarget); }}>
      {state && <p ref={errRef} tabIndex={-1} className="flash erro" role="alert">{state.error}</p>}
      {children}
      {state && <p className="flash erro" aria-hidden="true">{state.error}</p>}
    </form>
  );
}
