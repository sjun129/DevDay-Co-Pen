import { PAGE_SIZES } from 'tiptap-pagination-plus';

/** A4 (96dpi 기준 794×1123px), 여백 위·아래 25mm · 좌·우 20mm */
export const A4 = PAGE_SIZES.A4;

/** 이 폭보다 좁은 화면에서는 A4 페이지 대신 연속 보기로 전환한다 */
export const PAGED_VIEW_MIN_WIDTH = A4.pageWidth + 64;

export const DEFAULT_FONT_SIZE = '11pt';
export const DEFAULT_LINE_HEIGHT = '1.6';

/** value는 문서에 그대로 저장되는 CSS font-family. 폰트 변수는 app/layout.tsx에서 정의한다. */
export const FONT_FAMILIES = [
  { label: 'Pretendard', value: '' },
  { label: '나눔고딕', value: 'var(--font-nanum-gothic)' },
  { label: '나눔명조', value: 'var(--font-nanum-myeongjo)' },
  { label: '본명조', value: 'var(--font-noto-serif-kr)' },
] as const;

export const FONT_SIZES = ['9pt', '10pt', '11pt', '12pt', '13pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt'];

export const LINE_HEIGHTS = [
  { label: '100%', value: '1' },
  { label: '115%', value: '1.15' },
  { label: '130%', value: '1.3' },
  { label: '160%', value: '1.6' },
  { label: '180%', value: '1.8' },
  { label: '200%', value: '2' },
  { label: '250%', value: '2.5' },
];

export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;
export type TextAlignValue = (typeof TEXT_ALIGNS)[number];
