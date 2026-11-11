export function loginReturnPath(search: string) {
  const next = new URLSearchParams(search).get("next");
  // Allow only the private route tree; reject protocol-relative/external URLs,
  // backslashes and encoded separators. Resource filters can be added in D.
  return next && /^\/app(?:\/[a-zA-Z0-9/_-]*)?$/.test(next) ? next : "/app";
}
