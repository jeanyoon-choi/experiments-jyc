import * as first from '@/components/native-windows/1/server';
import * as second from '@/components/native-windows/2/server';
import * as third from '@/components/native-windows/3/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Control endpoints keep their original `/api/desktop/0915/<version>` URLs.
const versions: Record<string, typeof first> = { '1': first, '2': second, '3': third };
type Context = { params: Promise<{ date: string; version: string }> };

async function handler(request: Request, context: Context, method: 'GET' | 'POST') {
  const { date, version } = await context.params;
  const selected = date === '0915' ? versions[version] : undefined;
  return selected ? selected[method](request) : new Response(null, { status: 404 });
}

export const GET = (request: Request, context: Context) => handler(request, context, 'GET');
export const POST = (request: Request, context: Context) => handler(request, context, 'POST');
