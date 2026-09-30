import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { AGENT_ORIGIN, AI_SUGGESTION_MARK } from '@co-pen/shared';
import { insertParagraph } from './doc-model';

/**
 * F6 스트리밍 편집.
 * - 토큰을 flushIntervalMs 단위로 묶어 한 트랜잭션으로 반영한다 (연산 폭증 방지).
 * - 삽입은 항상 AI 전용 문단의 XmlText 끝에 하므로, 다른 곳 편집과 무관하게 제자리에 쌓인다.
 * - 줄바꿈은 새 문단으로 바꾼다.
 * - 모든 텍스트에 제안 마크를 붙인다 (F8).
 */
export class StreamWriter {
  private buffer = '';
  private timer: NodeJS.Timeout | undefined;
  private pendingBreak = false;
  private readonly attributes: Record<string, unknown>;

  constructor(
    private readonly doc: Y.Doc,
    private readonly fragment: Y.XmlFragment,
    private target: Y.XmlText,
    private readonly awareness: Awareness | null,
    private readonly flushIntervalMs: number,
    jobId: string,
  ) {
    this.attributes = { [AI_SUGGESTION_MARK]: { jobId } };
    this.moveCursor();
  }

  push(chunk: string) {
    this.buffer += chunk;
    this.timer ??= setTimeout(() => this.flush(), this.flushIntervalMs);
  }

  close() {
    this.flush();
  }

  private flush() {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.buffer) return;

    const text = this.buffer;
    this.buffer = '';
    this.doc.transact(() => this.write(text), AGENT_ORIGIN);
    this.moveCursor();
  }

  private write(text: string) {
    text.split(/\n+/).forEach((part, i) => {
      if (i > 0) this.pendingBreak = true;
      if (!part) return;
      if (this.pendingBreak && this.target.length > 0) this.startParagraph();
      this.pendingBreak = false;
      this.target.insert(this.target.length, part, this.attributes);
    });
  }

  private startParagraph() {
    const current = this.target.parent;
    const index = this.fragment.toArray().findIndex((node) => node === current);
    this.target = insertParagraph(this.fragment, index === -1 ? this.fragment.length : index + 1);
  }

  /** y-tiptap 커서 규약: awareness.cursor = { anchor, head } (RelativePosition JSON) */
  private moveCursor() {
    const position = Y.relativePositionToJSON(
      Y.createRelativePositionFromTypeIndex(this.target, this.target.length),
    );
    this.awareness?.setLocalStateField('cursor', { anchor: position, head: position });
  }
}
