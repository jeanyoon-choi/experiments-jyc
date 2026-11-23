import { redirect } from 'next/navigation';

// The desktop area became part of /pc (components/pc/archive/native-windows): old links land on the same path there.
export default async function DesktopExperimentPage({ params }: { params: Promise<{ experiment: string[] }> }) {
  const { experiment: path } = await params;
  redirect(`/pc/${path.map(encodeURIComponent).join('/')}`);
}
