import { redirect } from 'next/navigation';

// The desktop area became part of /pc (components/pc/archive/native-windows): old links land there.
export default function DesktopIndex() {
  redirect('/pc');
}
