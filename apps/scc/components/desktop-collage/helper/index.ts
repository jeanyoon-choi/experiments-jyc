import type { IncomingMessage, ServerResponse } from 'node:http';
import { act, onMac, statusOf, type Reply } from '../foundations/control/core.ts';
import { HELPER_PORT } from '../foundations/control/definition.ts';
import { definition as one } from '../primitives/1/plan.ts';
import { definition as two } from '../primitives/2/plan.ts';
import { definition as hype } from '../hype/1/plan.ts';
import { definition as hypeTwo } from '../hype/2/plan.ts';
import { definition as hypeThree } from '../hype/3/plan.ts';

// The Mac helper: the same control the local development server has, for
// pages served from anywhere. It listens on this Mac's loopback only and
// answers only approved origins; what it opens is planned here from validated
// settings, so a page cannot ask it to open anything else.

export { HELPER_PORT };
export const defaultOrigins = ['https://scc-jyc.vercel.app', 'https://exp-jyc.vercel.app', 'https://localhost:2000', 'https://127.0.0.1:2000', 'https://macbook-air-5.local:2000'];
const MAX_BODY = 64 * 1024;

type Body = { action?: unknown; settings?: unknown };
const experiments: Record<string, (body: Body, origin: string) => Promise<Reply>> = {
  'primitives/1': (body, origin) => act(one, body, origin),
  'primitives/2': (body, origin) => act(two, body, origin),
  'hype/1': (body, origin) => act(hype, body, origin),
  'hype/2': (body, origin) => act(hypeTwo, body, origin),
  'hype/3': (body, origin) => act(hypeThree, body, origin),
};

const route = /^\/desktop-collage\/((?:primitives|hype)\/[^/]+)\/control$/;

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('Too large.')); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function createHelper(origins: readonly string[]) {
  return async function handle(request: IncomingMessage, response: ServerResponse) {
    const origin = request.headers.origin;
    const send = ({ status, body }: Reply, cors = true) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
      if (cors && origin) headers['Access-Control-Allow-Origin'] = origin;
      response.writeHead(status, headers).end(JSON.stringify(body));
    };
    if (!origin || !origins.includes(origin)) return send({ status: 403, body: { message: 'Origin not approved.' } }, false);
    const run = experiments[route.exec(new URL(request.url ?? '/', 'https://127.0.0.1').pathname)?.[1] ?? ''];
    if (!run) return send({ status: 404, body: { message: 'Unknown experiment.' } });

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Chrome's Private Network Access preflight for a public page calling loopback.
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      }).end();
      return;
    }
    if (request.method === 'GET') return send(statusOf(onMac()));
    if (request.method !== 'POST') return send({ status: 405, body: { message: 'Method not allowed.' } });
    if (!onMac()) return send({ status: 503, body: { message: 'The helper runs windows on macOS only.' } });
    if (!request.headers['content-type']?.startsWith('application/json')) return send({ status: 415, body: { message: 'JSON required.' } });
    let body: Body;
    try { body = JSON.parse(await readBody(request)); } catch { return send({ status: 400, body: { message: 'Invalid request.' } }); }
    send(await run(body, origin));
  };
}
