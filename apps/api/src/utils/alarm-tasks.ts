/**
 * alarm-tasks.ts — several poll loops on one Durable Object alarm.
 *
 * What the Bun server's poll-loop was (setTimeout-chaining, never setInterval,
 * so cycles cannot overlap; exponential backoff up to a cap; only the
 * transitions logged), on a Durable Object: each task keeps when it next runs
 * and how often it has failed in the object's storage, the alarm is set to the
 * earliest of them, and every task that is due runs in turn. The cadence is
 * read at every cycle, so a variable change needs no redeploy, and the minute
 * cron (scheduled.ts) re-arms the alarm should it ever be lost.
 */
import { logger } from "../logs"

export type AlarmTask = {
  name: string
  everyMs: () => number
  maxBackoffMs: number
  /** How long after the first `ensureRunning` the task first runs. */
  initialDelayMs?: number
  /** Whether the task has what it needs right now; one that is off is re-checked every cadence. */
  enabled?: () => boolean
  /** One cycle; whatever it resolves to is logged with the recovery. */
  run: () => Promise<unknown>
  log: { failed: string; recovered: string }
}

type TaskState = { nextAt: number; failures: number }

const key = (name: string) => `task:${name}`

export class AlarmTasks {
  private running = false

  constructor(
    private readonly storage: DurableObjectStorage,
    private readonly tasks: AlarmTask[],
  ) {}

  /** Arm the alarm if none is set (idempotent — what the cron watchdog calls every minute). */
  async ensureRunning(): Promise<void> {
    if ((await this.storage.getAlarm()) !== null) return
    const now = Date.now()
    for (const task of this.tasks) {
      if (!(await this.storage.get<TaskState>(key(task.name)))) {
        await this.storage.put<TaskState>(key(task.name), { nextAt: now + (task.initialDelayMs ?? 0), failures: 0 })
      }
    }
    await this.arm()
  }

  /** Run every task that is due, then re-arm. The object's `alarm()`. */
  async onAlarm(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      for (const task of this.tasks) {
        const now = Date.now()
        const state = (await this.storage.get<TaskState>(key(task.name))) ?? { nextAt: now, failures: 0 }
        if (state.nextAt > now) continue
        if (task.enabled && !task.enabled()) {
          await this.storage.put<TaskState>(key(task.name), { nextAt: now + task.everyMs(), failures: 0 })
          continue
        }
        await this.storage.put<TaskState>(key(task.name), await this.runTask(task, state))
      }
    } finally {
      this.running = false
    }
    await this.arm()
  }

  /** Run one task now, whatever its schedule (tests and operator routes); its result, or the error it threw. */
  async runNow(name: string): Promise<unknown> {
    const task = this.tasks.find((t) => t.name === name)
    if (!task) throw new Error(`Unknown task ${name}`)
    const result = await task.run()
    await this.storage.put<TaskState>(key(task.name), { nextAt: Date.now() + task.everyMs(), failures: 0 })
    await this.arm()
    return result
  }

  /** Each task's schedule, for the debug routes. */
  async status(): Promise<Record<string, TaskState | null>> {
    const out: Record<string, TaskState | null> = {}
    for (const task of this.tasks) out[task.name] = (await this.storage.get<TaskState>(key(task.name))) ?? null
    return out
  }

  private async runTask(task: AlarmTask, state: TaskState): Promise<TaskState> {
    try {
      const summary = await task.run()
      if (state.failures > 0) {
        const meta = typeof summary === "object" && summary ? (summary as Record<string, unknown>) : {}
        logger.info(task.log.recovered, { task: task.name, afterFailures: state.failures, ...meta })
      }
      return { nextAt: Date.now() + task.everyMs(), failures: 0 }
    } catch (error) {
      const failures = state.failures + 1
      if (failures === 1) logger.error(task.log.failed, { task: task.name, error })
      return { nextAt: Date.now() + Math.min(task.everyMs() * 2 ** failures, task.maxBackoffMs), failures }
    }
  }

  private async arm(): Promise<void> {
    let earliest = Number.POSITIVE_INFINITY
    for (const task of this.tasks) {
      const state = await this.storage.get<TaskState>(key(task.name))
      if (state) earliest = Math.min(earliest, state.nextAt)
    }
    // Never in the past: a due task runs on the next tick, not in a tight loop.
    if (Number.isFinite(earliest)) await this.storage.setAlarm(Math.max(earliest, Date.now() + 1_000))
  }
}
