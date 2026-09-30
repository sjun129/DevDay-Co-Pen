import { Extension } from '@tiptap/core';
import { extractMentionPrompt } from '@co-pen/shared';

export interface MentionTriggerOptions {
  onMention: (mention: { prompt: string; mentionText: string }) => void;
}

/**
 * F5: 문단 끝에서 Enter를 누를 때 그 문단이 "@AI 요청" 형태면 에이전트를 호출한다.
 * Enter 자체는 막지 않는다(false 반환) → 평소처럼 줄이 바뀐다.
 */
export const MentionTrigger = Extension.create<MentionTriggerOptions>({
  name: 'mentionTrigger',
  priority: 1000,

  addOptions() {
    return { onMention: () => {} };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parentOffset !== $from.parent.content.size) return false;

        const mentionText = $from.parent.textContent.trim();
        const prompt = extractMentionPrompt(mentionText);
        if (prompt) this.options.onMention({ prompt, mentionText });
        return false;
      },
    };
  },
});
