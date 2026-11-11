import { Suspense } from "react";
import { CreateRequirement } from "@/features/requirements/list-create";
export const metadata = { title: "创建需求" };
export default function Page() {
  return (
    <Suspense fallback={<p role="status">正在加载…</p>}>
      <CreateRequirement />
    </Suspense>
  );
}
