import { celulares, type Specs } from "@veredito/core";
import { saveProductAction } from "../../actions";

export interface ProductFormValues {
  id?: string;
  category: string;
  brand: string;
  name: string;
  model: string;
  slug: string;
  releaseDate: string;
  summary: string;
  forWho: string[];
  notForWho: string[];
  pros: string[];
  cons: string[];
  specs: Specs;
  published: boolean;
}

/** Formulário gerado a partir da configuração da categoria — campos, unidades e grupos vêm de @veredito/core. */
export function ProductForm({ v, canWrite }: { v: ProductFormValues; canWrite: boolean }) {
  const config = celulares;
  return (
    <form action={saveProductAction} className="stack">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <input type="hidden" name="category" value={v.category} />
      <fieldset disabled={!canWrite}>
        <legend>Identificação</legend>
        <div className="form-grid">
          <label>Nome<input type="text" name="name" defaultValue={v.name} required /></label>
          <label>Marca<input type="text" name="brand" defaultValue={v.brand} required /></label>
          <label>Modelo<input type="text" name="model" defaultValue={v.model} /></label>
          <label>Endereço (slug)<input type="text" name="slug" defaultValue={v.slug} placeholder="gerado do nome" /></label>
          <label>Lançamento<input type="date" name="releaseDate" defaultValue={v.releaseDate} /></label>
        </div>
        <label style={{ marginTop: 12 }}>Veredito curto (aparece no topo da página)<textarea name="summary" rows={2} defaultValue={v.summary} /></label>
      </fieldset>
      <fieldset disabled={!canWrite}>
        <legend>Editorial (uma linha por item)</legend>
        <div className="form-grid">
          <label>Para quem é<textarea name="forWho" rows={3} defaultValue={v.forWho.join("\n")} /></label>
          <label>Para quem não é<textarea name="notForWho" rows={3} defaultValue={v.notForWho.join("\n")} /></label>
          <label>Pontos positivos<textarea name="pros" rows={3} defaultValue={v.pros.join("\n")} /></label>
          <label>Pontos negativos<textarea name="cons" rows={3} defaultValue={v.cons.join("\n")} /></label>
        </div>
      </fieldset>
      <fieldset disabled={!canWrite}>
        <legend>Ficha técnica</legend>
        <div className="form-grid">
          <label>Fonte dos dados
            <select name="sourceKind" defaultValue="manufacturer">
              <option value="manufacturer">Fabricante</option>
              <option value="editorial_test">Teste próprio</option>
              <option value="benchmark">Benchmark</option>
              <option value="manual">Outra / manual</option>
            </select>
          </label>
          <label>URL da fonte<input type="url" name="sourceUrl" placeholder="https://" /></label>
        </div>
        {config.groups.map((g) => (
          <details key={g.key} open>
            <summary>{g.label}</summary>
            <div className="form-grid" style={{ marginTop: 8 }}>
              {config.attributes.filter((a) => a.group === g.key).map((a) => {
                const val = v.specs[a.key];
                if (a.type === "bool") {
                  return (
                    <label key={a.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="hidden" name={`spec_present.${a.key}`} value="1" />
                      <input type="checkbox" name={`spec.${a.key}`} defaultChecked={val === true} /> {a.label}
                    </label>
                  );
                }
                if (a.type === "enum") {
                  return (
                    <label key={a.key}>{a.label}
                      <select name={`spec.${a.key}`} defaultValue={typeof val === "string" ? val : ""}>
                        <option value="">—</option>
                        {a.enumValues!.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={a.key}>{a.label}{a.unit ? ` (${a.unit})` : ""}
                    <input type="text" name={`spec.${a.key}`} defaultValue={val == null ? "" : String(val).replace(".", ",")}
                      inputMode={a.type === "int" || a.type === "decimal" ? "decimal" : "text"}
                      placeholder={a.plausible ? `${a.plausible.min}–${a.plausible.max}` : undefined} />
                  </label>
                );
              })}
            </div>
          </details>
        ))}
      </fieldset>
      {canWrite && (
        <div className="row">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="publish" defaultChecked={v.published} /> Publicado no site</label>
          <button className="btn btn-primary" type="submit">Salvar</button>
        </div>
      )}
    </form>
  );
}
