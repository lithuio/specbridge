"use client";

import { Dashboard } from "@/features/dashboard/overview";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  GitPullRequestArrow,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { useSession } from "./provider";
import { privateKey } from "@/lib/query/keys";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/shared/async-state";

export function AccountOverview() {
  const { user, runtime, store } = useSession();
  const account = useQuery({
    queryKey: privateKey(runtime.epoch, user!.id, "me"),
    queryFn: async ({ signal }) => {
      const response = await runtime.api("get", "/api/v1/me", { signal });
      // A cookie can change in another tab without this request seeing a 401.
      if (response.data.user.id !== user!.id) {
        void store.restore();
        throw new Error("SESSION_CHANGED");
      }
      return response;
    },
  });
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">你的协作起点</p>
        <h1>工作概览</h1>
        <p>欢迎回来，{user?.displayName}。让需求、确认与交付保持连贯。</p>
      </div>
      <Dashboard />
      <details className="account-details" open>
        <summary>当前账号与会话</summary>
        <section className="account-panel" aria-labelledby="account-title">
          <div className="section-heading">
            <h2 id="account-title">当前账号</h2>
            <span className="status-badge">已登录</span>
          </div>
          {account.error ? (
            <ErrorNotice error={account.error} />
          ) : (
            <dl>
              <dt>姓名</dt>
              <dd>{account.data?.data.user.displayName}</dd>
              <dt>邮箱</dt>
              <dd data-testid="account-email">
                {account.data?.data.user.email}
              </dd>
              <dt>账号权限</dt>
              <dd className="account-explanation">由工作空间与项目分别授予</dd>
            </dl>
          )}
          <Button
            variant="outline"
            onClick={() => void account.refetch()}
            disabled={account.isFetching}
          >
            <RefreshCw aria-hidden="true" />
            {account.isFetching ? "正在刷新…" : "刷新账号信息"}
          </Button>
        </section>
      </details>
      <section
        className="workflow-guide"
        id="workflow-guide"
        aria-labelledby="workflow-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="workflow-title">了解协作流程</h2>
            <p>先明确范围，再确认变更，最后验收成果。</p>
          </div>
          <span className="guide-label">使用说明</span>
        </div>
        <ol className="workflow-grid">
          <li>
            <FileText aria-hidden="true" />
            <span className="step-number">01 / CLARIFY</span>
            <h3>把需求说清</h3>
            <p>记录原始需求，通过问答补充细节，将共识保存为不可变规格版本。</p>
          </li>
          <li>
            <GitPullRequestArrow aria-hidden="true" />
            <span className="step-number">02 / CONFIRM</span>
            <h3>让双方确认</h3>
            <p>
              评估范围、工时与费用。供应方负责人先批准，客户再确认同一版本。
            </p>
          </li>
          <li>
            <PackageCheck aria-hidden="true" />
            <span className="step-number">03 / DELIVER</span>
            <h3>有依据地验收</h3>
            <p>交付关联已批准版本。退回意见与每次重新交付，都保留完整历史。</p>
          </li>
        </ol>
      </section>
    </>
  );
}
