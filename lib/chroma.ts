import { ChromaClient, type Collection } from 'chromadb';

const DEFAULT_COLLECTIONS = ['insights', 'curriculum', 'metadata'] as const;
export type DefaultCollection = (typeof DEFAULT_COLLECTIONS)[number];

let client: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!client) {
    const path =
      process.env.CHROMA_URL ??
      (() => {
        throw new Error('CHROMA_URL is not defined. Set it in your .env.local file.');
      })();

    client = new ChromaClient({ path });
  }

  return client;
}

export async function getOrCreateCollection(
  name: DefaultCollection | string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<Collection> {
  const chroma = getChromaClient();

  try {
    return await chroma.getCollection({ name });
  } catch (error) {
    // Collection may not exist yet
    return chroma.createCollection({
      name,
      metadata: metadata as any,
    });
  }
}
