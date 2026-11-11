import { Suspense } from "react";
import { RevisionDetail } from "@/features/requirements/detail";
export const metadata = { title: "历史规格" };
export default function Page() {
  return (
    <Suspense fallback={<p role="status">正在加载…</p>}>
      <RevisionDetail />
    </Suspense>
  );
}
