export async function startAfterDatabaseReady(
  databaseTasks: Array<() => Promise<void>>,
  listen: () => Promise<void> | void
): Promise<void> {
  for (const task of databaseTasks) await task()
  await listen()
}
