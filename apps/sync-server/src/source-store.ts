import { createClient } from '@supabase/supabase-js';
import { SOURCE_LIMITS, type DocumentSource, type SourceFormat } from '@co-pen/shared';
import type { SyncServerEnvironment } from './config';

export interface StoredSourceChunk {
  number: number;
  fileName: string;
  ordinal: number;
  text: string;
}

export interface CreateSourceInput {
  documentName: string;
  fileName: string;
  format: SourceFormat;
  byteSize: number;
  charCount: number;
  truncated: boolean;
  sha256: string;
  actorId: string;
  actorName: string;
  chunks: string[];
}

export interface SourceStore {
  listSources(documentName: string): Promise<DocumentSource[]>;
  /** 문서당 개수 제한에 걸리면 'too_many_files' */
  createSource(input: CreateSourceInput): Promise<DocumentSource | 'too_many_files'>;
  /** 없거나 이미 지운 자료면 false */
  deleteSource(
    documentName: string,
    sourceId: string,
    actorId: string,
    actorName: string,
  ): Promise<boolean>;
  listChunks(documentName: string): Promise<StoredSourceChunk[]>;
}

function mapSource(value: unknown): DocumentSource {
  const row = value as Record<string, unknown>;
  if (
    typeof row?.id !== 'string' ||
    typeof row.number !== 'number' ||
    typeof row.file_name !== 'string' ||
    typeof row.format !== 'string' ||
    typeof row.byte_size !== 'number' ||
    typeof row.char_count !== 'number' ||
    typeof row.truncated !== 'boolean' ||
    typeof row.uploaded_by_name !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    throw new Error('invalid_document_source_response');
  }
  return {
    id: row.id,
    number: row.number,
    fileName: row.file_name,
    format: row.format as SourceFormat,
    byteSize: row.byte_size,
    charCount: row.char_count,
    truncated: row.truncated,
    uploadedBy: row.uploaded_by_name,
    createdAt: row.created_at,
  };
}

function mapChunk(value: unknown): StoredSourceChunk {
  const row = value as Record<string, unknown>;
  if (
    typeof row?.number !== 'number' ||
    typeof row.file_name !== 'string' ||
    typeof row.ordinal !== 'number' ||
    typeof row.text !== 'string'
  ) {
    throw new Error('invalid_source_chunk_response');
  }
  return { number: row.number, fileName: row.file_name, ordinal: row.ordinal, text: row.text };
}

export function createSourceStore(environment: SyncServerEnvironment): SourceStore {
  if (environment.persistenceBackend !== 'supabase') throw new Error('sources_require_supabase');
  const supabase = createClient(environment.supabaseUrl!, environment.supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  });

  return {
    async listSources(documentName) {
      const { data, error } = await supabase
        .from('document_sources')
        .select('*')
        .eq('document_name', documentName)
        .is('deleted_at', null)
        .order('number', { ascending: true });
      if (error) throw new Error('source_list_failed');
      return (data as unknown[]).map(mapSource);
    },

    async createSource(input) {
      const { data, error } = await supabase.rpc('create_document_source', {
        p_document_name: input.documentName,
        p_file_name: input.fileName,
        p_format: input.format,
        p_byte_size: input.byteSize,
        p_char_count: input.charCount,
        p_truncated: input.truncated,
        p_sha256: input.sha256,
        p_actor_id: input.actorId,
        p_actor_name: input.actorName,
        p_chunks: input.chunks,
        p_max_sources: SOURCE_LIMITS.maxFilesPerDocument,
      });
      if (error) throw new Error('source_create_failed');
      const result = data as { status?: unknown; source?: unknown } | null;
      if (result?.status === 'too_many_files') return 'too_many_files';
      return mapSource(result?.source);
    },

    async deleteSource(documentName, sourceId, actorId, actorName) {
      const { data, error } = await supabase.rpc('delete_document_source', {
        p_document_name: documentName,
        p_source_id: sourceId,
        p_actor_id: actorId,
        p_actor_name: actorName,
      });
      if (error || typeof data !== 'boolean') throw new Error('source_delete_failed');
      return data;
    },

    async listChunks(documentName) {
      const { data, error } = await supabase.rpc('list_document_source_chunks', {
        p_document_name: documentName,
      });
      if (error || !Array.isArray(data)) throw new Error('source_chunks_failed');
      return data.map(mapChunk);
    },
  };
}
