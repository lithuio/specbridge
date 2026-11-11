import { Suspense } from "react";
import { RequirementDetail } from "@/features/requirements/detail";
export const metadata = { title: "需求详情" };
export default function Page() {
  return (
    <Suspense fallback={<p role="status">正在加载…</p>}>
      <RequirementDetail />
    </Suspense>
  );
}
