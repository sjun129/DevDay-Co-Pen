import Link from 'next/link';
import { PenLine } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-10 rounded-xl' : 'size-8 rounded-lg';
  const icon = size === 'lg' ? 'size-5' : 'size-4';
  const text = size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Co-Pen 홈">
      <span className={`bg-brand-gradient grid place-items-center text-white shadow-md shadow-brand-500/30 ${box}`}>
        <PenLine className={icon} strokeWidth={2.4} />
      </span>
      <span className={`font-bold tracking-tight text-ink ${text}`}>Co-Pen</span>
    </Link>
  );
}
