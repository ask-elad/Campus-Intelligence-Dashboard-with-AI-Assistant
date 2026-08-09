import "dotenv/config";
import { connectAllServers } from "./mcp/clients.js";
import { runAgentLoop } from "./agent.js";

async function main() {
  const allTools = await connectAllServers();
  console.log(`\nConnected. ${allTools.length} tools available.\n`);

  const testQuestion = "what's the weather today";
  console.log(`Question: ${testQuestion}\n`);

  const answer = await runAgentLoop(testQuestion, allTools);

  console.log("\n--- Final answer ---");
  console.log(answer);
}

main();