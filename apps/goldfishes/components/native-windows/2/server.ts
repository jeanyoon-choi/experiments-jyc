import { createDesktopControl } from '../shared/control-server.ts';
import { validateSettings } from './settings.ts';

export const { GET, POST } = createDesktopControl({
  runner: 'components/native-windows/2/runner.mjs',
  validate: validateSettings,
});
