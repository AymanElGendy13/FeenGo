import type { DestinationStream } from 'pino';

/** Collects every log line the application writes. */
export class LogCapture implements DestinationStream {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }

  /** Every line written so far, parsed. */
  entries(): Record<string, unknown>[] {
    return this.lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  clear(): void {
    this.lines.length = 0;
  }
}
