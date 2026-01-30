import { syncGitHubCodeActions } from "@/lib/github";

type Args = {
  date?: string;
  config?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    const next = argv[i + 1];
    if ((cur === "--date" || cur === "-d") && next) {
      args.date = next;
      i++;
      continue;
    }
    if ((cur === "--config" || cur === "-c") && next) {
      args.config = next;
      i++;
      continue;
    }
  }
  return args;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.date && !isValidDate(args.date)) {
    throw new Error(`Invalid --date. Expected YYYY-MM-DD, got: ${args.date}`);
  }

  const result = await syncGitHubCodeActions({
    date: args.date,
    configPath: args.config,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

