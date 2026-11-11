"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/shared/brand";
import { ErrorNotice } from "@/components/shared/async-state";
import { createApiClient } from "@/lib/api/client";
import { useSession } from "./provider";

function schema(register: boolean) {
  return z.object({
    displayName: register
      ? z
          .string()
          .trim()
          .min(1, "请输入姓名")
          .refine(
            (value) => Array.from(value).length <= 100,
            "姓名最多 100 个字符",
          )
      : z.string(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("请输入有效的邮箱地址").max(254, "邮箱地址过长")),
    password: z
      .string()
      .refine(
        (value) =>
          Array.from(value).length >= (register ? 15 : 1) &&
          Array.from(value).length <= 128 &&
          new TextEncoder().encode(value).length <= 512,
        register
          ? "密码需为 15–128 个字符，最多 512 字节"
          : "请输入密码，最多 128 个字符",
      ),
  });
}
type Values = z.infer<ReturnType<typeof schema>>;
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const { store, notice } = useSession();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<unknown>();
  const [registered, setRegistered] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema(registering)),
    defaultValues: { displayName: "", email: "", password: "" },
  });
  async function submit(values: Values) {
    setError(undefined);
    try {
      if (registering) {
        await createApiClient()("post", "/api/v1/auth/register", {
          body: values,
        });
        resetField("password");
        setVisible(false);
        setRegistered(true);
      } else {
        await store.login({ email: values.email, password: values.password });
        resetField("password");
      }
    } catch (failure) {
      setError(failure);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="关于 SpecBridge">
        <Brand />
        <div className="story-copy">
          <p className="eyebrow">让协作有据可循</p>
          <h2>
            把需求说清，
            <br />
            把每一次确认留住。
          </h2>
          <p className="story-description">
            从最初的想法，到最后一次验收。
            <br />
            让团队与客户在同一份规格上，走向下一步。
          </p>
          <ol className="story-steps">
            <li>
              <span>01</span>
              <div>
                <strong>澄清需求</strong>
                <p>问题说清楚，规格留版本。</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>双方确认</strong>
                <p>先供应方评估，再由客户确认。</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>交付验收</strong>
                <p>依据已批准版本，留下完整记录。</p>
              </div>
            </li>
          </ol>
        </div>
        <p className="story-footer">每一个版本，都有来处。</p>
      </section>
      <section className="auth-form-section" aria-labelledby="auth-title">
        <div className="auth-form-inner">
          <div className="mobile-brand">
            <Brand />
          </div>
          {registered ? (
            <div className="registration-success">
              <span className="success-icon">
                <Check aria-hidden="true" />
              </span>
              <h1 id="auth-title">账号创建成功</h1>
              <p>请使用刚才的邮箱和密码登录，开始你的协作。</p>
              <Link className="primary-link" href="/login">
                前往登录 <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <p className="eyebrow">
                {registering ? "开始协作" : "欢迎使用 SPECBRIDGE"}
              </p>
              <h1 id="auth-title">
                {registering ? "创建你的账号" : "欢迎回来"}
              </h1>
              <p className="form-intro">
                {registering
                  ? "一个账号，连接团队与客户。"
                  : "登录后，继续推进每一次确认。"}
              </p>
              {notice && (
                <div className="notice" role="status">
                  {notice}
                </div>
              )}
              {error !== undefined && <ErrorNotice error={error} />}
              <form noValidate onSubmit={handleSubmit(submit)}>
                {registering && (
                  <div className="form-field">
                    <label htmlFor="displayName">姓名</label>
                    <Input
                      id="displayName"
                      autoComplete="name"
                      {...register("displayName")}
                      aria-invalid={!!errors.displayName}
                      aria-describedby={
                        errors.displayName ? "name-error" : undefined
                      }
                    />
                    {errors.displayName && (
                      <p className="field-error" id="name-error" role="alert">
                        {errors.displayName.message}
                      </p>
                    )}
                  </div>
                )}
                <div className="form-field">
                  <label htmlFor="email">邮箱</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="username"
                    inputMode="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p className="field-error" id="email-error" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="form-field">
                  <label htmlFor="password">密码</label>
                  <div className="password-input">
                    <Input
                      id="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        registering ? "new-password" : "current-password"
                      }
                      {...register("password")}
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        [
                          registering ? "password-hint" : "",
                          errors.password ? "password-error" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="password-toggle"
                      aria-label={visible ? "隐藏密码" : "显示密码"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  {registering && (
                    <p className="field-hint" id="password-hint">
                      使用 15–128 个字符，建议使用较长的密码短语。
                    </p>
                  )}
                  {errors.password && (
                    <p className="field-error" id="password-error" role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "正在处理…"
                    : registering
                      ? "创建账号"
                      : "登录"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </form>
              <p className="auth-switch">
                {registering ? "已有账号？" : "还没有账号？"}{" "}
                <Link href={registering ? "/login" : "/register"}>
                  {registering ? "登录" : "创建账号"}
                </Link>
              </p>
              <p className="auth-footnote">
                项目权限由所属工作空间和项目关系决定。
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
