export interface DiffPart {
  type: 'same' | 'removed' | 'added';
  text: string;
}

/**
 * 단어 단위 차이 (LCS). 교정 제안을 화면에 보여 줄 때만 쓰고 문서에는 저장하지 않는다.
 * 공백도 토큰으로 남겨 두어 이어 붙이면 원래 문장이 된다.
 */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);

  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  // 바뀐 단어 사이의 공백은 양쪽 덩어리에 넣어, "지운 말 → 넣은 말"이 단어마다 엇갈리지 않고 구절로 묶이게 한다
  const parts: DiffPart[] = [];
  let removed = '';
  let added = '';
  let gap = '';
  const flush = () => {
    if (removed) parts.push({ type: 'removed', text: removed });
    if (added) parts.push({ type: 'added', text: added });
    removed = added = '';
  };
  const same = (text: string) => {
    const changing = removed || added;
    if (changing && !text.trim()) {
      gap += text;
      return;
    }
    flush();
    const last = parts[parts.length - 1];
    if (last?.type === 'same') last.text += gap + text;
    else parts.push({ type: 'same', text: gap + text });
    gap = '';
  };
  const change = (type: 'removed' | 'added', text: string) => {
    removed += gap;
    added += gap;
    gap = '';
    if (type === 'removed') removed += text;
    else added += text;
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      same(a[i]!);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      change('removed', a[i++]!);
    } else {
      change('added', b[j++]!);
    }
  }
  while (i < a.length) change('removed', a[i++]!);
  while (j < b.length) change('added', b[j++]!);
  flush();
  if (gap) parts.push({ type: 'same', text: gap });
  return parts;
}
