declare module "node-cron" {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export function validate(cronExpression: string): boolean;
  export function schedule(cronExpression: string, func: () => void, options?: { scheduled?: boolean; timezone?: string }): ScheduledTask;
  export function getTasks(): Map<string, ScheduledTask>;
}
