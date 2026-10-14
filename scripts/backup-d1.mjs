import { mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const root = process.cwd();
const backupDir = path.join(root, "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(backupDir, `streamlock-db-${stamp}.sql`);

await mkdir(backupDir, { recursive: true });

const execFileAsync = promisify(execFile);
const command = process.execPath;
const args = [path.join(root, "node_modules", "wrangler", "bin", "wrangler.js"), "d1", "export", "streamlock-db", "--remote", "--output", output, "--skip-confirmation"];

try {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log(`Respaldo D1 creado: ${path.relative(root, output)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
