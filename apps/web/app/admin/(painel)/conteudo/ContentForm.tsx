import { saveContentAction } from "../../actions";
import { ActionForm } from "../../ActionForm";

export interface ContentFormValues {
  id?: string;
  kind: string;
  title: string;
  products: string;
  evidence: string;
  intro: string;
  sections: string;
  picks: string;
}

export function ContentForm({ v, canWrite }: { v: ContentFormValues; canWrite: boolean }) {
  return (
    <ActionForm action={saveContentAction} className="stack">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <input type="hidden" name="category" value="celulares" />
      <fieldset disabled={!canWrite}>
        <legend>Conteúdo</legend>
        <div className="form-grid">
          <label>Tipo
            <select name="kind" defaultValue={v.kind}>
              <option value="review">Review (1 produto)</option>
              <option value="best_list">Guia “melhores” (3+ produtos)</option>
              <option value="guide">Explicador</option>
            </select>
          </label>
          <label>Título<input type="text" name="title" defaultValue={v.title} required /></label>
          <label>Produtos (endereços, separados por vírgula)<input type="text" name="products" defaultValue={v.products} placeholder="nebula-aurora-x1, orbita-s9" /></label>
          <label>Evidência
            <select name="evidence" defaultValue={v.evidence}>
              <option value="hands_on">Testado por nós</option>
              <option value="data_based">Baseado em dados</option>
              <option value="">Não se aplica</option>
            </select>
          </label>
        </div>
        <label style={{ marginTop: 12 }}>Introdução<textarea name="intro" rows={3} defaultValue={v.intro} /></label>
        <label style={{ marginTop: 12 }}>Seções (comece cada uma com “## Título”)<textarea name="sections" rows={14} defaultValue={v.sections} placeholder={"## Resumo\n...\n\n## Câmera\n..."} /></label>
        <label style={{ marginTop: 12 }}>Escolhas do guia — uma por linha: papel | endereço | nota (papéis: best, budget, premium, value)
          <textarea name="picks" rows={4} defaultValue={v.picks} placeholder="best | nebula-aurora-x1 | Melhor câmera da faixa" />
        </label>
        <label style={{ marginTop: 12 }}>Nota da revisão (changelog)<input type="text" name="changeNote" placeholder="O que mudou?" /></label>
      </fieldset>
      <p className="small muted">Números de specs e preços não devem ser digitados no texto: eles mudam. A página já mostra os dados atuais ao lado da review.</p>
      {canWrite && <button className="btn btn-primary" type="submit">Salvar rascunho / revisão</button>}
    </ActionForm>
  );
}
