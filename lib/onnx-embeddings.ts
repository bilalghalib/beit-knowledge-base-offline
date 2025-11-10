/**
 * ONNX Runtime Embeddings
 *
 * Provides offline text embeddings using a bundled ONNX model
 * No external dependencies or internet connection required!
 */

import * as ort from 'onnxruntime-node';
import path from 'path';
import { readFileSync } from 'fs';

// Model configuration
const MODEL_NAME = 'all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
const MAX_SEQUENCE_LENGTH = 256;

// Singleton session
let session: ort.InferenceSession | null = null;
let tokenizer: any = null;

/**
 * Simple tokenizer for the model
 * This is a basic implementation - in production you'd use a proper tokenizer
 */
class SimpleTokenizer {
  private vocab: Map<string, number> = new Map();
  private readonly specialTokens = {
    '[PAD]': 0,
    '[UNK]': 100,
    '[CLS]': 101,
    '[SEP]': 102,
  };

  constructor() {
    // Initialize with special tokens
    Object.entries(this.specialTokens).forEach(([token, id]) => {
      this.vocab.set(token, id);
    });
  }

  /**
   * Tokenize text into token IDs
   */
  encode(text: string, maxLength: number = MAX_SEQUENCE_LENGTH): {
    inputIds: number[];
    attentionMask: number[];
    tokenTypeIds: number[];
  } {
    // Lowercase and split into words
    const words = text.toLowerCase().split(/\s+/).slice(0, maxLength - 2);

    // Add CLS and SEP tokens
    const tokens = ['[CLS]', ...words, '[SEP]'];

    // Convert to IDs (using simple hash for unknown tokens)
    const inputIds = tokens.map(token =>
      this.vocab.get(token) ?? this.hashString(token) % 30000 + 1000
    );

    // Pad to maxLength
    const attentionMask = new Array(inputIds.length).fill(1);
    const tokenTypeIds = new Array(inputIds.length).fill(0);

    while (inputIds.length < maxLength) {
      inputIds.push(this.specialTokens['[PAD]']);
      attentionMask.push(0);
      tokenTypeIds.push(0);
    }

    return {
      inputIds: inputIds.slice(0, maxLength),
      attentionMask: attentionMask.slice(0, maxLength),
      tokenTypeIds: tokenTypeIds.slice(0, maxLength),
    };
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Initialize the ONNX model
 */
async function initializeModel(): Promise<void> {
  if (session) {
    return; // Already initialized
  }

  try {
    console.log('🤖 Initializing ONNX embedding model...');

    // Determine model path
    const isPackaged = process.env.NODE_ENV === 'production';
    const modelPath = isPackaged
      ? path.join(process.resourcesPath, 'models', 'embedding-model.onnx')
      : path.join(process.cwd(), 'models', 'embedding-model.onnx');

    console.log('   Model path:', modelPath);

    // Create inference session
    session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    });

    // Initialize simple tokenizer
    tokenizer = new SimpleTokenizer();

    console.log('✅ ONNX model loaded successfully');
    console.log(`   Model: ${MODEL_NAME}`);
    console.log(`   Dimensions: ${EMBEDDING_DIM}`);
  } catch (error) {
    console.error('❌ Failed to initialize ONNX model:', error);
    throw new Error(
      `Failed to load ONNX model. Make sure the model file exists at the expected path.`
    );
  }
}

/**
 * Mean pooling - take average of token embeddings
 */
function meanPooling(tokenEmbeddings: Float32Array, attentionMask: number[]): Float32Array {
  const seqLength = attentionMask.length;
  const embeddingDim = EMBEDDING_DIM;

  const pooled = new Float32Array(embeddingDim);
  let validTokens = 0;

  for (let i = 0; i < seqLength; i++) {
    if (attentionMask[i] === 1) {
      validTokens++;
      for (let j = 0; j < embeddingDim; j++) {
        pooled[j] += tokenEmbeddings[i * embeddingDim + j];
      }
    }
  }

  // Average
  for (let i = 0; i < embeddingDim; i++) {
    pooled[i] /= validTokens;
  }

  return pooled;
}

/**
 * Normalize vector to unit length
 */
function normalize(vector: Float32Array): number[] {
  let magnitude = 0;
  for (let i = 0; i < vector.length; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);

  const normalized = new Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / magnitude;
  }

  return normalized;
}

/**
 * Generate embedding for text using ONNX model
 */
export async function getEmbedding(text: string): Promise<number[]> {
  // Ensure model is loaded
  if (!session) {
    await initializeModel();
  }

  if (!session || !tokenizer) {
    throw new Error('ONNX model not initialized');
  }

  try {
    // Tokenize input
    const { inputIds, attentionMask, tokenTypeIds } = tokenizer.encode(text);

    // Prepare tensors
    const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
    const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);
    const tokenTypeIdsTensor = new ort.Tensor('int64', BigInt64Array.from(tokenTypeIds.map(BigInt)), [1, tokenTypeIds.length]);

    // Run inference
    const results = await session.run({
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
      token_type_ids: tokenTypeIdsTensor,
    });

    // Get last hidden state
    const lastHiddenState = results.last_hidden_state.data as Float32Array;

    // Apply mean pooling
    const pooled = meanPooling(lastHiddenState, attentionMask);

    // Normalize to unit length
    const embedding = normalize(pooled);

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Batch embedding generation
 */
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await getEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Check if ONNX model is available
 */
export function isModelAvailable(): boolean {
  const isPackaged = process.env.NODE_ENV === 'production';
  const modelPath = isPackaged
    ? path.join(process.resourcesPath, 'models', 'embedding-model.onnx')
    : path.join(process.cwd(), 'models', 'embedding-model.onnx');

  try {
    const fs = require('fs');
    return fs.existsSync(modelPath);
  } catch {
    return false;
  }
}
