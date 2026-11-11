import {
  test as base,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

export const origin = "http://127.0.0.1:3000";
export const writeHeaders = {
  Origin: origin,
  "X-CSRF-Protection": "1",
  "Sec-Fetch-Site": "same-origin",
};
export type Account = { email: string; password: string; displayName: string };
export function newAccount(displayName: string): Account {
  return {
    email: `${randomUUID()}@example.test`,
    password: `Browser-only-${randomUUID()}`,
    displayName,
  };
}
export async function registerAccount(
  api: APIRequestContext,
  account: Account,
) {
  const result = await api.post("/api/v1/auth/register", {
    headers: writeHeaders,
    data: account,
  });
  expect(result.status()).toBe(201);
}
export async function login(page: Page, account: Account) {
  await page.goto("/login");
  await page.getByLabel("邮箱", { exact: true }).fill(account.email);
  await page.getByLabel("密码", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId("account-email")).toHaveText(account.email);
}
export const test = base.extend<
  object,
  { accounts: { a: Account; b: Account; client: Account } }
>({
  page: async ({ page }, provide) => {
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await provide(page);
    expect(errors.map(error => error.name)).toEqual([]);
  },
  accounts: [
    async ({ playwright }, use) => {
      const api = await playwright.request.newContext({ baseURL: origin });
      const accounts = {
        a: newAccount("林知远"),
        b: newAccount("陈思宁"),
        client: newAccount("客户协作账号"),
      };
      for (const account of Object.values(accounts))
        await registerAccount(api, account);
      await use(accounts);
      await api.dispose();
      // UUID accounts remain only in disposable test tmpfs. No public-table reset,
      // no trigger disabling; future phases can keep immutable workflow fixtures.
    },
    { scope: "worker" },
  ],
});
export { expect };
