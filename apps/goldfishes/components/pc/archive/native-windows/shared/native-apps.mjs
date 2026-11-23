import { copyFile, mkdir, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Real applications the scores act on. Nothing here types into an app or sends
// a message: Slack opens a channel, Terminal runs a fixed read-only command.

// Destination observed in the user's Slack UI; never use the publishing webhook.
export const slackChannelUrl = 'slack://channel?team=T0BP28XG1V3&id=C0BP7M8E6SD';

export function windowId(value) {
  if (!/^\d+$/.test(value)) throw new Error('창 ID를 얻지 못했습니다.');
  return value;
}

export const openSlack = session => session.execute('/usr/bin/open', [slackChannelUrl]);

export async function openTrialTerminal(session) {
  return windowId(await session.apple(`tell application "Terminal"
    do script "uname -sm; uptime"
    return id of front window
  end tell`));
}

export async function openPreview(session) {
  await session.execute('/usr/bin/open', ['-a', 'Preview', await preparePreview()]);
}

/** Stages the technology atlas in a private temp copy that Preview may open. */
export async function preparePreview() {
  const source = fileURLToPath(new URL('../../../public/images/0908/tech-keyword-atlas/tech-keyword-atlas-v1.png', import.meta.url));
  const directory = `/private/tmp/goldfishes-desktop-preview-${process.getuid()}`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = `${directory}/tech-keyword-atlas-v1.png`;
  await copyFile(source, destination);
  await chmod(destination, 0o600);
  return destination;
}
