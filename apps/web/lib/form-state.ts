/** Resultado de uma server action de formulário: erro para mostrar sem perder o que foi digitado. Sucesso redireciona. */
export type FormState = { error: string; at: number } | null;

export const formError = (error: string): FormState => ({ error, at: Date.now() });
