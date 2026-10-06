'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { Placeholder } from '@tiptap/extensions';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { DOC_FIELD } from '@co-pen/shared';
import type { RoomSession } from '@/lib/collab/room-session';
import { AiSuggestion, pendingSuggestions } from '@/lib/editor/ai-suggestion';
import { A4, PAGED_VIEW_MIN_WIDTH } from '@/lib/editor/formats';
import { BlockLineHeight } from '@/lib/editor/line-height';
import { MentionTrigger } from '@/lib/editor/mention-trigger';
import { useMediaQuery } from '@/lib/use-media-query';
import { AgentPanel } from './agent-panel';
import { FormatToolbar } from './format-toolbar';

export function CollaborativeEditor({ session }: { session: RoomSession }) {
  const { doc, provider, user, send, sendAgentMention, stateVector } = session;
  const paged = useMediaQuery(`(min-width: ${PAGED_VIEW_MIN_WIDTH}px)`);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        // Yjs가 히스토리를 관리하므로 기본 undo/redo는 끈다
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc, field: DOC_FIELD }),
        CollaborationCaret.configure({ provider, user }),
        Placeholder.configure({
          placeholder: ({ editor: current }) =>
            current.isEmpty
              ? '여기에 내용을 입력하세요. 문단 첫머리에 @AI 요청을 쓰고 Enter를 누르면 AI가 함께 씁니다.'
              : '@AI 요청을 입력하고 Enter',
        }),
        TextStyle,
        FontFamily,
        FontSize,
        BlockLineHeight,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        // 페이지는 화면 표시(decoration)로만 나눈다. 문서 구조는 바뀌지 않으므로 Yjs·에이전트와 무관하다.
        PaginationPlus.configure({
          ...A4,
          pageGap: 28,
          pageBreakBackground: '#f6f7fb',
          pageGapBorderColor: '#e2e8f0',
          contentMarginTop: 0,
          contentMarginBottom: 0,
          headerLeft: '',
          headerRight: '',
          footerLeft: '',
          footerRight: '{page}',
        }),
        AiSuggestion,
        MentionTrigger.configure({
          // Enter로 문단이 나뉜 다음 보내야 워커가 그 새 줄까지 본 상태에서 위치를 정한다
          onMention: ({ mentionText }) =>
            setTimeout(() =>
              sendAgentMention({
                mentionText,
                requestedBy: user.name,
                stateVector: stateVector(),
              }),
            ),
        }),
      ],
      editorProps: {
        attributes: { class: 'tiptap-editor', spellcheck: 'false' },
      },
    },
    [doc, provider],
  );

  // A4 폭이 안 들어가는 좁은 화면에서는 페이지 없이 이어서 보여 준다
  useEffect(() => {
    if (!editor) return;
    if (paged) editor.commands.enablePagination();
    else editor.commands.disablePagination();
  }, [editor, paged]);

  const suggestions = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? pendingSuggestions(current.state.doc) : []),
  });

  const pageCount = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current?.isInitialized
        ? Math.max(current.view.dom.querySelectorAll('[data-rm-pagination] > .rm-page-break').length, 1)
        : 1,
  });

  return (
    <div className="flex flex-1 flex-col">
      <FormatToolbar editor={editor} pageCount={paged ? (pageCount ?? 1) : null} />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 xl:flex-row xl:items-start xl:py-10">
        <div className="min-w-0 flex-1">
          <div className={paged ? 'mx-auto w-fit' : ''}>
            <EditorContent editor={editor} />
          </div>
        </div>
        <AgentPanel
          session={session}
          suggestions={suggestions ?? []}
          onAccept={(jobId) => editor?.chain().focus().acceptAiSuggestion(jobId).run()}
          onReject={(jobId) => editor?.chain().focus().rejectAiSuggestion(jobId).run()}
          onUndoAgent={() => send({ type: 'agent:undo', requestedBy: user.name })}
        />
      </div>
    </div>
  );
}
