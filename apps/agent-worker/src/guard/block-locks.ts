/**
 * 에이전트 간 조율: 같은 문단을 두 에이전트가 동시에 건드리지 않게 하는 프로세스 내부 잠금.
 * 모든 에이전트 세션이 이 워커 한 프로세스에 있으므로 이것이 실제 잠금이고, awareness는 표시용이다.
 * 키는 문단 번호가 아니라 Yjs 항목 ID라서 위에 문단이 끼어들어도 같은 문단을 가리킨다.
 * 사람은 잠그지 않는다. 사람과의 충돌은 수락 시 원문 변경 확인으로 다룬다.
 */
const tails = new Map<string, Promise<void>>();

/** 앞선 작업이 끝날 때까지 기다린 뒤 잠금을 잡는다. 돌려받은 함수를 부르면 풀린다. */
export async function lockBlock(room: string, blockId: string): Promise<() => void> {
  const key = `${blockId}@${room}`;
  const previous = tails.get(key) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => (release = resolve));
  const tail = previous.then(() => current);
  tails.set(key, tail);

  await previous;
  return () => {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  };
}
