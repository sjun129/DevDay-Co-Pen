import { Room } from '@/components/room/room';

export default async function DocumentPage({ params }: PageProps<'/d/[docId]'>) {
  const { docId } = await params;
  return <Room key={docId} docId={docId} />;
}
