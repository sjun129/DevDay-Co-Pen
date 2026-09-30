import { Extension } from '@tiptap/core';

const TYPES = ['paragraph', 'heading'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockLineHeight: {
      setBlockLineHeight: (lineHeight: string) => ReturnType;
      unsetBlockLineHeight: () => ReturnType;
    };
  }
}

/**
 * 문단 단위 줄간격. @tiptap/extension-text-style의 LineHeight는 글자(span)에 걸려
 * 기본값보다 좁게 줄일 수 없으므로 TextAlign처럼 블록 속성으로 둔다.
 */
export const BlockLineHeight = Extension.create({
  name: 'blockLineHeight',

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          TYPES.map((type) => commands.updateAttributes(type, { lineHeight })).some(Boolean),
      unsetBlockLineHeight:
        () =>
        ({ commands }) =>
          TYPES.map((type) => commands.resetAttributes(type, 'lineHeight')).some(Boolean),
    };
  },
});
