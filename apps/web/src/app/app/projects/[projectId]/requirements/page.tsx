import { Suspense } from "react";
import { RequirementList } from "@/features/requirements/list-create";
export const metadata = { title: "项目需求" };
export default function Page() {
  return (
    <Suspense fallback={<p role="status">正在加载…</p>}>
      <RequirementList />
    </Suspense>
  );
}
