export function Flash({ sp }: { sp: { ok?: string; erro?: string } }) {
  if (sp.erro) return <p className="flash erro" role="alert">{sp.erro}</p>;
  if (sp.ok) return <p className="flash ok" role="status">{sp.ok}</p>;
  return null;
}
