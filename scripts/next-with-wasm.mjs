import { spawn } from "node:child_process";
import { join } from "node:path";

const command = process.argv[2] ?? "dev";
const args = process.argv.slice(3);

process.env.NEXT_TEST_WASM_DIR ??= join(
  process.cwd(),
  "node_modules",
  "@next",
  "swc-wasm-nodejs"
);

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, command, ...args], {
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
