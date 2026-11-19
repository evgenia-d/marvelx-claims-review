const res = await fetch("http://localhost:8787/api/replay/restart", { method: "POST" });
if (!res.ok) {
  console.error(`Replay restart failed: ${res.status}`);
  process.exit(1);
}
console.log("Replay restarted");
