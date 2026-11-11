// Every private key starts with the session lifetime and user. Add resource IDs,
// filters and pagination after this prefix; never persist private cache to disk.
export const privateKey = (
  epoch: number,
  userId: string,
  ...resource: readonly unknown[]
) => ["session", epoch, userId, ...resource] as const;
