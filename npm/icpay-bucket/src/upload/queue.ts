export class ConcurrentQueue {
  private readonly concurrency: number
  private running = 0
  private queue: (() => Promise<void>)[] = []

  constructor(concurrency: number = 4) {
    this.concurrency = Math.max(1, concurrency)
  }

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        this.running++
        try {
          const res = await task()
          resolve(res)
        } catch (err) {
          reject(err)
        } finally {
          this.running--
          this.next()
        }
      }

      if (this.running < this.concurrency) {
        void run()
      } else {
        this.queue.push(run)
      }
    })
  }

  private next(): void {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      const nextTask = this.queue.shift()
      if (nextTask) {
        void nextTask()
      }
    }
  }

  get active(): number {
    return this.running
  }

  get pending(): number {
    return this.queue.length
  }
}
