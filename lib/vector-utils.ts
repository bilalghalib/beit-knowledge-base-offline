/**
 * Pure JavaScript vector operations for semantic search
 * No external dependencies - works entirely in-memory
 */

export interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  type: 'insight' | 'curriculum' | 'metadata';
}

/**
 * Calculate dot product of two vectors
 */
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculate magnitude (length) of a vector
 */
function magnitude(vector: number[]): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

/**
 * Search documents by vector similarity
 * @param queryEmbedding - The query vector
 * @param documents - Array of documents with embeddings
 * @param topK - Number of top results to return
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Sorted array of matches with similarity scores
 */
export function vectorSearch(
  queryEmbedding: number[],
  documents: VectorDocument[],
  topK: number = 10,
  minSimilarity: number = 0.1
): Array<VectorDocument & { similarity: number }> {
  // Calculate similarity for each document
  const results = documents
    .map((doc) => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .filter((result) => result.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

/**
 * Normalize a vector to unit length
 * This can speed up cosine similarity calculations
 */
export function normalizeVector(vector: number[]): number[] {
  const mag = magnitude(vector);
  if (mag === 0) return vector;

  return vector.map((v) => v / mag);
}

/**
 * Load embedded documents from JSON file
 */
export async function loadEmbeddedDocuments(
  filePath: string
): Promise<VectorDocument[]> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load embedded documents from ${filePath}:`, error);
    return [];
  }
}

/**
 * In-memory vector database
 * Loads all embeddings into memory for fast search
 */
export class VectorDB {
  private documents: VectorDocument[] = [];
  private loaded: boolean = false;

  constructor() {}

  /**
   * Load all embedded documents into memory
   */
  async load(dataDir: string): Promise<void> {
    if (this.loaded) {
      console.log('VectorDB already loaded');
      return;
    }

    console.log('📚 Loading embedded documents into memory...');
    const path = await import('path');

    // Load all embedded data files
    const [insights, curriculum, metadata] = await Promise.all([
      loadEmbeddedDocuments(path.join(dataDir, 'insights_embedded.json')),
      loadEmbeddedDocuments(path.join(dataDir, 'curriculum_embedded.json')),
      loadEmbeddedDocuments(path.join(dataDir, 'metadata_embedded.json')),
    ]);

    this.documents = [...insights, ...curriculum, ...metadata];
    this.loaded = true;

    console.log(`✅ Loaded ${this.documents.length} documents`);
    console.log(
      `   - Insights: ${insights.length}`
    );
    console.log(
      `   - Curriculum: ${curriculum.length}`
    );
    console.log(
      `   - Metadata: ${metadata.length}`
    );
  }

  /**
   * Search for similar documents
   */
  search(
    queryEmbedding: number[],
    options: {
      topK?: number;
      minSimilarity?: number;
      type?: 'insight' | 'curriculum' | 'metadata';
    } = {}
  ): Array<VectorDocument & { similarity: number }> {
    if (!this.loaded) {
      throw new Error('VectorDB not loaded. Call load() first.');
    }

    const { topK = 10, minSimilarity = 0.1, type } = options;

    // Filter by type if specified
    const documentsToSearch = type
      ? this.documents.filter((doc) => doc.type === type)
      : this.documents;

    return vectorSearch(queryEmbedding, documentsToSearch, topK, minSimilarity);
  }

  /**
   * Get total number of documents
   */
  count(): number {
    return this.documents.length;
  }

  /**
   * Check if database is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Singleton instance
let vectorDBInstance: VectorDB | null = null;

/**
 * Get or create VectorDB singleton
 */
export function getVectorDB(): VectorDB {
  if (!vectorDBInstance) {
    vectorDBInstance = new VectorDB();
  }
  return vectorDBInstance;
}
