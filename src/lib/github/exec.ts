import { execFile } from 'node:child_process';

export type ExecResult = {
  stdout: string;
  stderr: string;
};

export class ExecError extends Error {
  readonly command: string;
  readonly args: string[];
  readonly stderr: string;

  constructor(command: string, args: string[], stderr: string) {
    super(`Command failed: ${command} ${args.join(' ')}`.trim());
    this.name = 'ExecError';
    this.command = command;
    this.args = args;
    this.stderr = stderr;
  }
}

/**
 * Exec a command and return stdout/stderr.
 * This intentionally does not use a shell.
 */
export async function execFileText(
  command: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<ExecResult> {
  return await new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new ExecError(command, args, stderr || String(error)));
          return;
        }
        resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
      }
    );
  });
}

export async function execFileJson<T>(
  command: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<T> {
  const { stdout } = await execFileText(command, args, options);
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON from ${command}. Output started with: ${stdout.slice(0, 200)}`
    );
  }
}

