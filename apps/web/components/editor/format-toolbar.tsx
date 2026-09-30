'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  ALargeSmall,
  ChevronDown,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Type,
  UnfoldVertical,
  type LucideIcon,
} from 'lucide-react';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  TEXT_ALIGNS,
  type TextAlignValue,
} from '@/lib/editor/formats';

const ALIGN_BUTTONS: Record<TextAlignValue, { icon: LucideIcon; label: string }> = {
  left: { icon: TextAlignStart, label: '왼쪽 정렬' },
  center: { icon: TextAlignCenter, label: '가운데 정렬' },
  right: { icon: TextAlignEnd, label: '오른쪽 정렬' },
  justify: { icon: TextAlignJustify, label: '양쪽 정렬' },
};

interface FormatState {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  textAlign: TextAlignValue;
}

function readFormat(editor: Editor): FormatState {
  const textStyle = editor.getAttributes('textStyle');
  const block = editor.isActive('heading') ? editor.getAttributes('heading') : editor.getAttributes('paragraph');
  return {
    fontFamily: (textStyle.fontFamily as string | undefined) ?? '',
    fontSize: (textStyle.fontSize as string | undefined) ?? '',
    lineHeight: (block.lineHeight as string | undefined) ?? '',
    textAlign: TEXT_ALIGNS.find((align) => editor.isActive({ textAlign: align })) ?? 'left',
  };
}

export function FormatToolbar({ editor, pageCount }: { editor: Editor | null; pageCount: number | null }) {
  const format = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? readFormat(current) : null),
  });
  const disabled = !editor || !format;

  function run(apply: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) {
    if (editor) apply(editor.chain().focus()).run();
  }

  const onFontFamily = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    run((chain) => (value ? chain.setFontFamily(value) : chain.unsetFontFamily()));
  };
  const onFontSize = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    run((chain) => (value ? chain.setFontSize(value) : chain.unsetFontSize()));
  };
  const onLineHeight = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    run((chain) => (value === DEFAULT_LINE_HEIGHT ? chain.unsetBlockLineHeight() : chain.setBlockLineHeight(value)));
  };

  return (
    <div className="sticky top-16 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
      <div
        role="toolbar"
        aria-label="서식"
        className="mx-auto flex h-12 w-full max-w-[1400px] items-center gap-1.5 overflow-x-auto px-4 sm:px-6"
      >
        <ToolbarSelect icon={Type} label="글꼴" value={format?.fontFamily ?? ''} onChange={onFontFamily} disabled={disabled} width="w-32">
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </ToolbarSelect>

        <ToolbarSelect icon={ALargeSmall} label="글자 크기" value={format?.fontSize ?? ''} onChange={onFontSize} disabled={disabled} width="w-24">
          <option value="">기본</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.replace('pt', '')}
              {size === DEFAULT_FONT_SIZE ? ' (본문)' : ''}
            </option>
          ))}
        </ToolbarSelect>

        <Divider />

        <ToolbarSelect
          icon={UnfoldVertical}
          label="줄간격"
          value={format?.lineHeight || DEFAULT_LINE_HEIGHT}
          onChange={onLineHeight}
          disabled={disabled}
          width="w-24"
        >
          {LINE_HEIGHTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ToolbarSelect>

        <Divider />

        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
          {TEXT_ALIGNS.map((align) => {
            const { icon: Icon, label } = ALIGN_BUTTONS[align];
            const active = format?.textAlign === align;
            return (
              <button
                key={align}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => run((chain) => chain.setTextAlign(align))}
                className={`grid size-8 place-items-center rounded-md transition ${
                  active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>

        {pageCount !== null && (
          <span className="ml-auto shrink-0 pl-3 text-xs font-medium whitespace-nowrap text-slate-500">
            A4 · 총 {pageCount}쪽
          </span>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
}

interface ToolbarSelectProps {
  icon: LucideIcon;
  label: string;
  value: string;
  width: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}

function ToolbarSelect({ icon: Icon, label, value, width, disabled, onChange, children }: ToolbarSelectProps) {
  return (
    <label className={`relative flex h-8 shrink-0 items-center rounded-lg ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-400 hover:ring-slate-300 ${width}`}>
      <Icon className="pointer-events-none absolute left-2.5 size-3.5 text-slate-400" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        title={label}
        className="h-full w-full cursor-pointer appearance-none rounded-lg bg-transparent pr-7 pl-8 text-sm text-slate-700 outline-none disabled:cursor-not-allowed"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-slate-400" aria-hidden />
    </label>
  );
}
