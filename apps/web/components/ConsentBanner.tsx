"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "consent_v1";
const OPEN_EVENT = "consent:open";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type Choice = "loading" | "unset" | "granted" | "denied";

// O referrer só vale para a primeira página carregada; vai no primeiro page_view com consentimento,
// que é o que abre a sessão (antes disso o evento é anônimo e a origem não é guardada).
let referrerSent = false;

/** page_view com origem da visita. Sem consentimento o servidor grava só o evento anônimo, sem sessão. */
function pageView(withReferrer: boolean) {
  const q = new URLSearchParams(location.search);
  const props: Record<string, string | boolean> = {};
  for (const k of UTM_KEYS) {
    const v = q.get(k);
    if (v) props[k] = v.slice(0, 100);
  }
  if (q.has("gclid")) props.gclid = true;
  if (withReferrer && !referrerSent) {
    referrerSent = true;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : "";
      if (host && host !== location.hostname) props.ref = host;
    } catch {}
  }
  return { name: "page_view", path: location.pathname, props };
}

function send(events: unknown[]) {
  const body = JSON.stringify(events);
  if (!navigator.sendBeacon?.("/api/e", body)) {
    fetch("/api/e", { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
  }
}

/** Banner LGPD leve: nada de terceiros carrega antes da escolha. "Rejeitar" tem o mesmo destaque que "Aceitar". */
export function ConsentBanner({ gaId }: { gaId: string | null }) {
  const [choice, setChoice] = useState<Choice>("loading");
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch {}
    setChoice(v === "granted" || v === "denied" ? v : "unset");
    const reopen = () => setChoice("unset");
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (choice === "loading" || pathname === lastPath.current) return;
    lastPath.current = pathname;
    send([pageView(choice === "granted")]);
  }, [choice, pathname]);

  useEffect(() => {
    if (choice !== "granted" || !gaId || document.getElementById("ga4")) return;
    const s = document.createElement("script");
    s.id = "ga4";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(s);
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() { w.dataLayer.push(arguments); };
    w.gtag("js", new Date());
    w.gtag("config", gaId, { anonymize_ip: true });
  }, [choice, gaId]);

  function decide(v: "granted" | "denied") {
    try { localStorage.setItem(KEY, v); } catch {}
    setChoice(v);
    // Junto com a escolha vai a página atual, para a sessão começar já nesta visita.
    const consent = { name: "consent", props: { analytics: v } };
    send(v === "granted" ? [consent, pageView(true)] : [consent]);
  }

  if (choice !== "unset") return null;
  return (
    <div className="card consent" role="dialog" aria-label="Privacidade">
      <p className="small">
        Usamos medição própria e o Google Analytics para entender de onde vêm as visitas, somente com sua permissão. Sem isso o site funciona normalmente.{" "}
        <a href="/privacidade">Saiba mais</a>
      </p>
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={() => decide("denied")}>Rejeitar</button>
        <button className="btn btn-ghost btn-sm" onClick={() => decide("granted")}>Aceitar</button>
      </div>
    </div>
  );
}

/** Reabre o banner para mudar a escolha (revogar consentimento). */
export function ConsentSettingsButton() {
  return (
    <button className="btn btn-ghost btn-sm" type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Mudar preferências de privacidade
    </button>
  );
}
