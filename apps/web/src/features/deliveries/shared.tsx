"use client";

import { z } from "zod";
import { PersonTime, textSchema } from "@/features/requirements/shared";
import type { Delivery } from "./queries";
import { statusLabel } from "./queries";

export function safeHttps(value: string) {
  try {
    const url = new URL(value);
    return (
      value.length <= 2048 &&
      /^https:\/\/[^/?#@]/u.test(value) &&
      !value.slice(8).split(/[/?#]/u)[0].includes("@") &&
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password &&
      !/[\s\u0000-\u001f\u007f\\]/u.test(value)
    );
  } catch {
    return false;
  }
}
export const deliverySchema = z.object({
  artifactUrl: z
    .string()
    .trim()
    .refine(
      safeHttps,
      "请输入完整 HTTPS 链接，不含凭据、空白或反斜杠，最多 2,048 字符",
    ),
  summary: textSchema("交付说明", 20_000),
  evidence: z
    .string()
    .refine(
      (v) =>
        !v.trim() ||
        v
          .trim()
          .split(/\r?\n/)
          .every((line) => safeHttps(line.trim())),
      "每行须为有效 HTTPS 证据链接",
    )
    .refine(
      (v) => !v.trim() || v.trim().split(/\r?\n/).length <= 100,
      "最多 100 条证据链接",
    )
    .transform((v) =>
      v.trim()
        ? v
            .trim()
            .split(/\r?\n/)
            .map((line) => line.trim())
        : [],
    ),
});
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return safeHttps(href) ? (
    <a
      className="text-link external-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
    >
      {children} ↗
    </a>
  ) : (
    <span>链接不可用</span>
  );
}
export function DeliveryContent({ delivery }: { delivery: Delivery }) {
  return (
    <section
      className="surface-panel"
      aria-label={`交付 D${delivery.deliveryNo} 内容`}
    >
      <div className="section-heading">
        <h3>交付 D{delivery.deliveryNo}</h3>
        <span className="status-badge" data-state={delivery.status}>
          {statusLabel[delivery.status]}
        </span>
      </div>
      <PersonTime userId={delivery.createdBy} time={delivery.createdAt} />
      <h4>成果链接</h4>
      <ExternalLink href={delivery.artifactUrl}>
        {delivery.artifactUrl}
      </ExternalLink>
      <h4>交付说明</h4>
      <p className="record-text">{delivery.summary}</p>
      <h4>验证证据 · {delivery.evidenceLinks.length} 条</h4>
      {delivery.evidenceLinks.length ? (
        <ul className="criteria-list">
          {delivery.evidenceLinks.map((url, i) => (
            <li key={i}>
              <ExternalLink href={url}>{url}</ExternalLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-copy">未附证据链接</p>
      )}
    </section>
  );
}
export function ReviewRecord({ delivery }: { delivery: Delivery }) {
  const review = delivery.review;
  return (
    <section className="surface-panel" aria-label="本次验收记录">
      <h3>本次验收记录</h3>
      {review ? (
        <>
          <p className="status-badge" data-state={review.decision}>
            {statusLabel[review.decision]}
          </p>
          <PersonTime userId={review.reviewerId} time={review.createdAt} />
          <p className="record-text">{review.comment ?? "未附评论"}</p>
        </>
      ) : (
        <p className="muted-copy">客户尚未决定。</p>
      )}
    </section>
  );
}
