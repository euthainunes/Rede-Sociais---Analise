"use client";
import { useEffect, useState } from "react";

const KEY = "consent_v1";

/** Banner LGPD leve: nada de terceiros carrega antes da escolha. "Rejeitar" tem o mesmo destaque que "Aceitar". */
export function ConsentBanner({ gaId }: { gaId: string | null }) {
  const [choice, setChoice] = useState<"unset" | "granted" | "denied">("granted");

  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch {}
    setChoice(v === "granted" || v === "denied" ? v : "unset");
  }, []);

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
    navigator.sendBeacon?.("/api/e", JSON.stringify([{ name: "consent", props: { analytics: v } }]));
  }

  if (choice !== "unset") return null;
  return (
    <div className="card consent" role="dialog" aria-label="Privacidade">
      <p className="small">
        Usamos cookies de medição (Google Analytics) somente com sua permissão. Sem eles o site funciona normalmente.{" "}
        <a href="/privacidade">Saiba mais</a>
      </p>
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={() => decide("denied")}>Rejeitar</button>
        <button className="btn btn-ghost btn-sm" onClick={() => decide("granted")}>Aceitar</button>
      </div>
    </div>
  );
}
