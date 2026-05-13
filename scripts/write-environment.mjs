import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputFile = join(root, 'src', 'environments', 'environment.generated.ts');
const apiUrl = process.env['NG_APP_API_URL'] ?? 'https://backend-plataforma-abi.vercel.app';

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(
  outputFile,
  `export const environment = {\n  apiUrl: ${JSON.stringify(apiUrl)},\n};\n`,
  'utf-8',
);
