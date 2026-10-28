/**
 * Emit JSON Schema (draft 2020-12) for profiles, scenarios and the result property bag from the zod sources.
 * Run: npm run schemas   (the output is committed; CI fails if it drifts)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Profile, Scenario } from '../src/core/schema.js';

const out = path.resolve('schemas');
await mkdir(out, { recursive: true });

const emit = async (name: string, schema: z.ZodType, title: string) => {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any', io: 'input' }) as Record<string, unknown>;
  const doc = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://foldproof.dev/schemas/${name}.schema.json`,
    title,
    ...json,
  };
  await writeFile(path.join(out, `${name}.schema.json`), JSON.stringify(doc, null, 2) + '\n');
  console.log(`wrote schemas/${name}.schema.json`);
};

await emit('profile', Profile, 'foldproof device / configuration profile');
await emit('scenario', Scenario, 'foldproof scenario (startup + transition)');
