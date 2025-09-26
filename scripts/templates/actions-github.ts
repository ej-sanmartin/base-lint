import fs from 'fs';

function loadEventPayload(): Record<string, unknown> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const file = fs.readFileSync(eventPath, 'utf8');
      return JSON.parse(file) as Record<string, unknown>;
    } catch (error) {
      console.warn('Failed to read GitHub event payload:', error);
    }
  }

  const rawPayload = process.env.GITHUB_EVENT_PAYLOAD;
  if (rawPayload) {
    try {
      return JSON.parse(rawPayload) as Record<string, unknown>;
    } catch (error) {
      console.warn('Failed to parse GITHUB_EVENT_PAYLOAD:', error);
    }
  }

  return {};
}

export const context = {
  payload: loadEventPayload() as {
    pull_request?: {
      head?: { repo?: { full_name?: string } };
      base?: { repo?: { full_name?: string } };
    };
  },
};
