/**
 * Unit tests for lib/slack.ts
 *
 * Run with:
 *   npx tsx lib/__tests__/slack.test.ts
 *
 * Uses Node's built-in `assert/strict` only — no jest, no external test runner.
 * tsx resolves the `.js` extension to `.ts` automatically.
 */

import assert from 'node:assert/strict';
import { sendSlackMessage, notifySlack } from '../slack.js';

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------

let failed = false;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err: unknown) {
    failed = true;
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${name}: ${reason}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Save and restore an env var around a test. */
function withEnv(key: string, value: string | undefined, fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    const original = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
    try {
      await fn();
    } finally {
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  };
}

/** Save and restore `globalThis.fetch` around a test. */
function withFetch(mock: typeof globalThis.fetch | undefined, fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    const originalFetch = (globalThis as Record<string, unknown>).fetch as typeof globalThis.fetch | undefined;
    if (mock === undefined) {
      delete (globalThis as Record<string, unknown>).fetch;
    } else {
      globalThis.fetch = mock;
    }
    try {
      await fn();
    } finally {
      if (originalFetch === undefined) {
        delete (globalThis as Record<string, unknown>).fetch;
      } else {
        globalThis.fetch = originalFetch;
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// 1. SLACK_WEBHOOK_URL absent → returns without calling fetch
await test(
  'returns without calling fetch when SLACK_WEBHOOK_URL is absent',
  withEnv('SLACK_WEBHOOK_URL', undefined, async () => {
    let fetchCalled = false;
    const mockFetch = async () => {
      fetchCalled = true;
      return new Response('ok', { status: 200 });
    };

    await withFetch(mockFetch as unknown as typeof globalThis.fetch, async () => {
      await sendSlackMessage({ blocks: [{ type: 'section' }] });
      assert.equal(fetchCalled, false, 'fetch should not have been called');
    })();
  })
);

// 2. Fetch is called with the correct URL and method POST when env is set
await test(
  'calls fetch with the correct URL and method POST when SLACK_WEBHOOK_URL is set',
  withEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/TEST/WEBHOOK', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;

    const mockFetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method;
      return new Response('ok', { status: 200 });
    };

    await withFetch(mockFetch as unknown as typeof globalThis.fetch, async () => {
      await sendSlackMessage({ blocks: [{ type: 'section' }] });
    })();

    assert.equal(capturedUrl, 'https://hooks.slack.com/services/TEST/WEBHOOK');
    assert.equal(capturedMethod, 'POST');
  })
);

// 3. Fetch is called with a body that is valid JSON containing a `blocks` array
await test(
  'calls fetch with a body that is valid JSON containing a blocks array',
  withEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/TEST/WEBHOOK', async () => {
    let parsedBody: Record<string, unknown> | undefined;

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const raw = typeof init?.body === 'string' ? init.body : String(init?.body ?? '');
      parsedBody = JSON.parse(raw) as Record<string, unknown>;
      return new Response('ok', { status: 200 });
    };

    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hello' } }];

    await withFetch(mockFetch as unknown as typeof globalThis.fetch, async () => {
      await sendSlackMessage({ blocks, text: 'hello' });
    })();

    assert.ok(parsedBody !== undefined, 'body should have been captured');
    assert.ok(Array.isArray(parsedBody!.blocks), '`blocks` must be an array');
    assert.deepEqual(parsedBody!.blocks, blocks, '`blocks` array must match what was passed in');
  })
);

// 4. Fetch throws → function swallows the error (no throw propagates)
await test(
  'swallows errors thrown by fetch and does not propagate them',
  withEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/TEST/WEBHOOK', async () => {
    const throwingFetch = async () => {
      throw new Error('network failure');
    };

    await withFetch(throwingFetch as unknown as typeof globalThis.fetch, async () => {
      // Must not throw — any propagation would cause this assertion to be skipped
      // and the test runner's try/catch would catch the error instead.
      await sendSlackMessage({ blocks: [{ type: 'section' }] });
    })();

    // If we reach here, the error was swallowed correctly.
  })
);

// 5. notifySlack: calls sendSlackMessage with correct ticket count in header
await test(
  'notifySlack: calls sendSlackMessage with correct ticket count in header',
  withEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/TEST/NOTIFY', async () => {
    let parsedBody: Record<string, unknown> | undefined;

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const raw = typeof init?.body === 'string' ? init.body : String(init?.body ?? '');
      parsedBody = JSON.parse(raw) as Record<string, unknown>;
      return new Response('ok', { status: 200 });
    };

    const tickets = [
      {
        id: 'TICKET-001',
        file: 'src/foo.ts',
        status: 'open',
        confidence: 0.95,
        resolution: 'fix it',
        reasoning: 'because',
        approved: false,
        head: 'abc123',
        incoming: 'def456',
      },
      {
        id: 'TICKET-002',
        file: 'src/bar.ts',
        status: 'open',
        confidence: 0.80,
        resolution: 'review',
        reasoning: 'needs eyes',
        approved: false,
        head: 'aaa111',
        incoming: 'bbb222',
      },
    ];

    await withFetch(mockFetch as unknown as typeof globalThis.fetch, async () => {
      await notifySlack(tickets as Parameters<typeof notifySlack>[0]);
    })();

    assert.ok(parsedBody !== undefined, 'fetch body should have been captured');
    assert.ok(Array.isArray(parsedBody!.blocks), '`blocks` must be an array');

    const blocks = parsedBody!.blocks as Array<Record<string, unknown>>;
    const headerBlock = blocks.find((b) => b.type === 'header') as Record<string, unknown> | undefined;
    assert.ok(headerBlock !== undefined, 'a header block must be present');
    const headerText = JSON.stringify(headerBlock!.text ?? headerBlock);
    assert.ok(headerText.includes('2'), 'header must contain the ticket count "2"');

    const sectionBlock = blocks.find((b) => b.type === 'section') as Record<string, unknown> | undefined;
    assert.ok(sectionBlock !== undefined, 'a section block must be present');
    const sectionText = JSON.stringify(sectionBlock!.text ?? sectionBlock);
    assert.ok(sectionText.includes('TICKET-001'), 'section must reference the first ticket id');
  })
);

// 6. notifySlack: does nothing when tickets array is empty
await test(
  'notifySlack: does nothing when tickets array is empty',
  withEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/TEST/NOTIFY', async () => {
    let fetchCalled = false;
    const mockFetch = async () => {
      fetchCalled = true;
      return new Response('ok', { status: 200 });
    };

    await withFetch(mockFetch as unknown as typeof globalThis.fetch, async () => {
      await notifySlack([]);
    })();

    assert.equal(fetchCalled, false, 'fetch must NOT be called for an empty tickets array');
  })
);

// ---------------------------------------------------------------------------
// Exit code
// ---------------------------------------------------------------------------

if (failed) {
  process.exit(1);
}
