import { Flash } from "../../../Flash";
import { ProductForm } from "../ProductForm";
import { requireStaff } from "@/lib/admin";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireStaff("catalog:write");
  return (
    <>
      <h1>Novo produto</h1>
      <Flash sp={await searchParams} />
      <ProductForm canWrite v={{ category: "celulares", brand: "", name: "", model: "", slug: "", releaseDate: "", summary: "", forWho: [], notForWho: [], pros: [], cons: [], specs: {}, published: false }} />
    </>
  );
}
