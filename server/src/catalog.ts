// Loads the fixture pack once at startup: claims, documents with their text, and each claim's run
// parsed with the contract's RunEvent schema. A bad line fails fast with its file and line number.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { DocumentMeta, Priority, RunEvent } from "@shared/contract";

// The fixture's own shapes (fixtures/README). Not API, so they live here, not in shared/contract.
const FixtureClaim = z.object({
  id: z.string(),
  claim_id: z.string(),
  claimant_name: z.string(),
  product: z.string(),
  priority: Priority,
  received_at: z.iso.datetime({ offset: true }),
  run: z.string(),
  start_after_ms: z.number().int().min(0).nullable(), // null: the run finished before the session began
});
const FixtureDocument = DocumentMeta.extend({ claim_id: z.string() });

export type CatalogDocument = DocumentMeta & { text: string };
export type CatalogClaim = Omit<z.infer<typeof FixtureClaim>, "run"> & {
  events: RunEvent[]; // delivery order, as the file has them (duplicates included)
  documents: CatalogDocument[];
};
export type Catalog = { claims: CatalogClaim[] };

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (cause) {
    throw new Error(`${file}: ${(cause as Error).message}`, { cause });
  }
}

// The live SSE loop sends by position in the due list, so a run must be in delivery order.
function readRun(file: string): RunEvent[] {
  let previousAt = 0;
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, i) => {
      if (line.trim() === "") return [];
      const where = `${file}:${i + 1}`;
      let raw: unknown;
      try {
        raw = JSON.parse(line);
      } catch (cause) {
        throw new Error(`${where}: not valid JSON (${(cause as Error).message})`, { cause });
      }
      const parsed = RunEvent.safeParse(raw);
      if (!parsed.success) throw new Error(`${where}: not a valid run event (${z.prettifyError(parsed.error)})`);
      if (parsed.data.at_ms < previousAt)
        throw new Error(`${where}: at_ms ${parsed.data.at_ms} is earlier than the previous line's ${previousAt}`);
      previousAt = parsed.data.at_ms;
      return [parsed.data];
    });
}

export function loadCatalog(root: string): Catalog {
  const claimsFile = join(root, "claims.json");
  const indexFile = join(root, "documents", "index.json");
  const claims = z.array(FixtureClaim).parse(readJson(claimsFile));
  const documents = z.array(FixtureDocument).parse(readJson(indexFile));

  return {
    claims: claims.map(({ run, ...claim }) => ({
      ...claim,
      events: readRun(join(root, run)),
      documents: documents
        .filter((d) => d.claim_id === claim.claim_id)
        .map(({ document_id, title, kind }) => ({
          document_id, title, kind,
          text: readFileSync(join(root, "documents", `${document_id}.txt`), "utf8"),
        })),
    })),
  };
}
