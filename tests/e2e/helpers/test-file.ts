import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const FIXTURE_PATH = join(process.cwd(), "tests/fixtures/tiny-test.pdf");

/** Minimal valid PDF for optional upload tests — no sensitive content. */
export function createTinyPdfFixture(): string {
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF`;

  mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(FIXTURE_PATH, pdf, "utf8");
  return FIXTURE_PATH;
}
