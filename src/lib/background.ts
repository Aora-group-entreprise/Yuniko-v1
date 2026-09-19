export type BackgroundJob = { name: string; run: () => Promise<void> };
const jobs = new Map<string, BackgroundJob>();
export function registerBackgroundJob(job: BackgroundJob): void { jobs.set(job.name, job); }
export async function runBackgroundJob(name: string): Promise<void> {
  const job = jobs.get(name);
  if (!job) throw new Error(`Unknown background job: ${name}`);
  await job.run();
}
export function listBackgroundJobs(): string[] { return [...jobs.keys()]; }
