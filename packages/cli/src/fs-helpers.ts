import { promises as fs } from 'fs';
import path from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeFile(filePath: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, 'utf8');
}

export async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function readJSON<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

export async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
