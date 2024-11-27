const SERVER_SCRIPT = "server.ts";
const WRK_COMMAND = "wrk";
const WRK_LUA_SCRIPT = "post.lua";
const SERVER_ADDRESS = "http://localhost:8000";

const denoCommand = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-env", "--allow-write", SERVER_SCRIPT],
});

const wrkCommand = new Deno.Command(WRK_COMMAND, {
  args: ["--threads", "1", "--connections", "300", "--duration", "1s", "--script", WRK_LUA_SCRIPT, SERVER_ADDRESS],
});

for (let i = 1; i <= 10; i++) {
  const serverProcess = denoCommand.spawn();
  console.log(`Run ${i}: Server started.`);

  // Allow the server to start up fully before testing
  await new Promise((resolve) => setTimeout(resolve, 100));

  const wrkProcess = wrkCommand.spawn();
  console.log(`Run ${i}: wrk load test started.`);

  await wrkProcess.output();

  await new Promise((r) => setTimeout(r, 2000));
  serverProcess.kill();
  console.log(`Run ${i}: Server stopped.`);
}
