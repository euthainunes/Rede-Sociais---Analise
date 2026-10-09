/**
 * Cliente LLM (Claude) com orçamento diário e tratamento de recusa.
 * Modelo configurável por AI_MODEL; padrão claude-opus-5-5. Fallback server-side "default" habilitado.
 */
import Anthropic from "@anthropic-ai/sdk";

export interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

export interface LlmResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  refused: boolean;
}

export interface LlmClient {
  complete(req: LlmRequest): Promise<LlmResult>;
}

/** Preços por milhão de tokens (USD) para estimativa de custo; atualizar quando mudar. */
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-5-5": { in: 4, out: 20 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
};

export class BudgetExceededError extends Error {}

/** Orçamento simples em memória por processo; em produção, persistir em Redis/Postgres. */
export class DailyBudget {
  private day = "";
  private spent = 0;
  private readonly limitUsd: number;
  constructor(limitUsd: number) {
    this.limitUsd = limitUsd;
  }
  check(): void {
    this.roll();
    if (this.spent >= this.limitUsd) throw new BudgetExceededError("Orçamento diário de IA esgotado");
  }
  add(usd: number): void {
    this.roll();
    this.spent += usd;
  }
  get remaining(): number {
    this.roll();
    return Math.max(0, this.limitUsd - this.spent);
  }
  private roll() {
    const d = new Date().toISOString().slice(0, 10);
    if (d !== this.day) {
      this.day = d;
      this.spent = 0;
    }
  }
}

export class ClaudeClient implements LlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly budget: DailyBudget;
  constructor(
    model: string = process.env.AI_MODEL ?? "claude-opus-5-5",
    budget = new DailyBudget(Number(process.env.AI_DAILY_BUDGET_USD ?? 20)),
    client?: Anthropic,
  ) {
    this.model = model;
    this.budget = budget;
    this.client = client ?? new Anthropic();
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    this.budget.check();
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: req.effort ?? "low" },
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: req.user }],
    });
    const refused = response.stop_reason === "refusal";
    const text = refused
      ? ""
      : response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    const p = PRICING[response.model] ?? PRICING[this.model] ?? { in: 0, out: 0 };
    const costUsd = (response.usage.input_tokens * p.in + response.usage.output_tokens * p.out) / 1_000_000;
    this.budget.add(costUsd);
    return {
      text,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd,
      refused,
    };
  }
}

export function createLlmClient(env: Record<string, string | undefined> = process.env): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) return null;
  return new ClaudeClient(env.AI_MODEL ?? "claude-opus-5-5", new DailyBudget(Number(env.AI_DAILY_BUDGET_USD ?? 20)));
}
