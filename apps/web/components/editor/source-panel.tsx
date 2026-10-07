'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import type { onStatelessParameters, onStatusParameters } from '@hocuspocus/provider';
import { WebSocketStatus } from '@hocuspocus/provider';
import {
  parseStatelessMessage,
  sourceLabel,
  SOURCE_ERROR_MESSAGES,
  SOURCE_FORMATS,
  SOURCE_LIMITS,
  type DocumentSource,
} from '@co-pen/shared';
import { FileText, FileUp, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import type { RoomSession } from '@/lib/collab/room-session';
import {
  SOURCE_ACCEPT,
  SourceRequestError,
  sourceErrorMessage,
  validateSourceFile,
} from '@/lib/collab/sources';

const LIMIT_HINT = `${SOURCE_FORMATS.map((format) => format.toUpperCase()).join('·')} · 파일당 ${
  SOURCE_LIMITS.maxFileBytes / 1024 / 1024
}MB · 최대 ${SOURCE_LIMITS.maxFilesPerDocument}개`;

const isUnavailable = (error: unknown) =>
  error instanceof SourceRequestError && error.code === 'storage_unavailable';

export function SourcePanel({ session }: { session: RoomSession }) {
  // null = 아직 한 번도 불러오지 못함
  const [sources, setSources] = useState<DocumentSource[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ key: string; name: string }[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    // 신호가 연달아 오면 응답 순서가 뒤바뀔 수 있으므로 마지막 요청의 결과만 반영한다
    const request = ++requestRef.current;
    try {
      const next = await session.listSources();
      if (request !== requestRef.current) return;
      setSources(next);
      setLoadError(null);
      setUnavailable(false);
    } catch (error) {
      if (request !== requestRef.current) return;
      if (isUnavailable(error)) setUnavailable(true);
      else setLoadError(sourceErrorMessage(error));
    }
  }, [session]);

  useEffect(() => {
    const handleStateless = ({ payload }: onStatelessParameters) => {
      if (parseStatelessMessage(payload)?.type === 'sources:changed') void reload();
    };
    // 연결이 끊긴 동안 놓친 sources:changed는 다시 오지 않으므로 재연결 때 새로 불러온다
    const handleStatus = ({ status }: onStatusParameters) => {
      if (status === WebSocketStatus.Connected) void reload();
    };
    session.provider.on('stateless', handleStateless);
    session.provider.on('status', handleStatus);
    void reload();
    return () => {
      session.provider.off('stateless', handleStateless);
      session.provider.off('status', handleStatus);
    };
  }, [session, reload]);

  async function upload(files: File[]) {
    if (files.length === 0) return;
    let count = (sources?.length ?? 0) + uploading.length;
    const rejected: string[] = [];
    const accepted: { key: string; file: File }[] = [];
    for (const file of files) {
      const code = validateSourceFile(file, count);
      if (code) {
        rejected.push(`${file.name}: ${SOURCE_ERROR_MESSAGES[code]}`);
      } else {
        accepted.push({ key: crypto.randomUUID(), file });
        count += 1;
      }
    }
    setFailures(rejected);
    setUploading((current) => [...current, ...accepted.map(({ key, file }) => ({ key, name: file.name }))]);

    // 하나씩 올려야 서버가 매기는 [자료N] 번호가 고른 순서와 같아진다
    for (const { key, file } of accepted) {
      try {
        await session.uploadSource(file);
        void reload();
      } catch (error) {
        if (isUnavailable(error)) setUnavailable(true);
        setFailures((current) => [...current, `${file.name}: ${sourceErrorMessage(error)}`]);
      }
      setUploading((current) => current.filter((item) => item.key !== key));
    }
  }

  async function remove(source: DocumentSource) {
    const label = `[${sourceLabel(source.number)}]`;
    const confirmed = window.confirm(
      `자료함에서 ${label} ${source.fileName} 파일을 지울까요?\n본문에 이미 붙은 ${label} 표시는 지워지지 않고 남아요.`,
    );
    if (!confirmed) return;
    setFailures([]);
    setDeletingId(source.id);
    try {
      await session.deleteSource(source.id);
      await reload();
    } catch (error) {
      setFailures([`${source.fileName}: ${sourceErrorMessage(error)}`]);
    } finally {
      setDeletingId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  if (unavailable) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <h2 className="font-semibold text-ink">자료함</h2>
        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500" role="status">
          {SOURCE_ERROR_MESSAGES.storage_unavailable}
        </p>
      </section>
    );
  }

  const empty = sources?.length === 0 && uploading.length === 0;

  return (
    <section
      className={`rounded-2xl border bg-white p-5 shadow-soft transition ${
        dragging ? 'border-brand-400 ring-4 ring-brand-100' : 'border-slate-200/80'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">자료함</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {sources?.length ?? 0}/{SOURCE_LIMITS.maxFilesPerDocument}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">올린 자료는 AI가 글을 쓸 때 근거로 써요.</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby="source-limit-hint"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-3 py-3 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
      >
        <FileUp className="size-4" />
        파일 올리기
        <span className="hidden font-normal text-brand-600/80 sm:inline">또는 끌어다 놓기</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={SOURCE_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          void upload(Array.from(event.target.files ?? []));
          // 같은 파일을 다시 고를 때도 change가 일어나게 비운다
          event.target.value = '';
        }}
      />
      <p id="source-limit-hint" className="mt-1.5 text-center text-[11px] text-slate-400">
        {LIMIT_HINT}
      </p>

      {failures.length > 0 && (
        <ul role="alert" className="mt-3 flex flex-col gap-1 rounded-lg bg-rose-50 p-2.5 text-xs leading-relaxed text-rose-700">
          {failures.map((failure, index) => (
            <li key={index}>{failure}</li>
          ))}
        </ul>
      )}

      {loadError && (
        <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
          <span className="flex-1">{loadError}</span>
          <button
            type="button"
            onClick={() => void reload()}
            aria-label="자료 목록 다시 불러오기"
            className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      )}

      {sources === null && !loadError ? (
        <p className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-slate-400" role="status">
          <LoaderCircle className="size-4 animate-spin" />
          자료 목록을 불러오는 중
        </p>
      ) : empty ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm leading-relaxed text-slate-400">
          자료를 올리면 AI가 그 내용을 근거로 쓰고
          <br />
          [자료N]으로 출처를 표시해요
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {sources?.map((source) => {
            const label = `[${sourceLabel(source.number)}]`;
            const deleting = deletingId === source.id;
            return (
              <li
                key={source.id}
                className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                data-source-number={source.number}
              >
                <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
                  {label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink" title={source.fileName}>
                    {source.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {source.format.toUpperCase()} · {source.charCount.toLocaleString('ko-KR')}자 · {source.uploadedBy}
                  </p>
                  {source.truncated && (
                    <p className="mt-1 w-fit rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                      앞부분만 사용
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(source)}
                  disabled={deleting}
                  title={`${label} ${source.fileName} 지우기`}
                  aria-label={`${label} ${source.fileName} 지우기`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:text-rose-600 hover:ring-rose-200 disabled:opacity-50"
                >
                  {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </li>
            );
          })}
          {uploading.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/40 p-3"
              role="status"
            >
              <LoaderCircle className="size-4 shrink-0 animate-spin text-brand-600" />
              <FileText className="size-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{item.name}</span>
              <span className="shrink-0 text-xs text-slate-500">올리는 중</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
