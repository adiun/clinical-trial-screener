// Starts the Fastify backend and the Vite dev server together.
// No extra dependency: plain child_process with prefixed output.
import { spawn } from "node:child_process";

const procs = [
  { name: "server", color: "\x1b[36m", cmd: "npm", args: ["run", "dev:server"] },
  { name: "client", color: "\x1b[35m", cmd: "npm", args: ["run", "dev:client"] },
];

const children = procs.map(({ name, color, cmd, args }) => {
  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env, shell: process.platform === "win32" });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) out.write(prefix + line + "\n");
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.stdout.write(`${prefix}exited with code ${code}\n`);
      shutdown(code);
    }
  });
  return child;
});

let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const c of children) if (!c.killed) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 200);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
