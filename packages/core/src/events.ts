/** Catálogo de eventos próprios (docs/12 §12.3). Eventos fora da lista são descartados. */
export const EVENT_NAMES = [
  "page_view", "view_product", "view_item_list", "search", "search_result_click", "filter_apply",
  "comparison", "compare_add", "price_history_view", "outbound_click", "add_price_alert", "newsletter_signup",
  "ai_chat_start", "ai_recommendation", "ai_recommendation_click", "product_share", "video_click",
  "scroll_depth", "feedback_submit", "web_vitals", "consent",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export interface IncomingEvent {
  name: EventName;
  path: string | null;
  productId: string | null;
  props: Record<string, string | number | boolean | null>;
}

const MAX_EVENTS = 20;
const MAX_PROPS = 20;

/** Valida e higieniza um lote vindo do navegador (dado não confiável). */
export function sanitizeEvents(input: unknown): IncomingEvent[] {
  if (!Array.isArray(input)) return [];
  const out: IncomingEvent[] = [];
  for (const raw of input.slice(0, MAX_EVENTS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.name !== "string" || !(EVENT_NAMES as readonly string[]).includes(r.name)) continue;
    const props: IncomingEvent["props"] = {};
    if (r.props && typeof r.props === "object") {
      for (const [k, v] of Object.entries(r.props as Record<string, unknown>).slice(0, MAX_PROPS)) {
        if (!/^[a-z0-9_]{1,40}$/.test(k)) continue;
        if (typeof v === "string") props[k] = v.slice(0, 200);
        else if (typeof v === "number" && Number.isFinite(v)) props[k] = v;
        else if (typeof v === "boolean" || v === null) props[k] = v;
      }
    }
    out.push({
      name: r.name as EventName,
      path: typeof r.path === "string" && r.path.startsWith("/") ? r.path.slice(0, 300) : null,
      productId: typeof r.productId === "string" ? r.productId.slice(0, 64) : null,
      props,
    });
  }
  return out;
}
