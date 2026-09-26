/**
 * Slack notification helper.
 *
 * Sends a Block Kit message to the webhook URL stored in
 * `SLACK_WEBHOOK_URL`.  If the env var is absent, or if the
 * request fails for any reason, the function silently returns —
 * Slack notifications are best-effort and must never break the
 * main application flow.
 */

import type { Ticket } from './types.js';

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackMessageOptions {
  /** Block Kit blocks to include in the message. */
  blocks: SlackBlock[];
  /** Optional plain-text fallback shown in notifications. */
  text?: string;
}

/**
 * Post a Slack message to the configured incoming-webhook URL.
 *
 * @param options - Block Kit message payload.
 * @returns A promise that resolves once the request completes (or is skipped).
 *          Never rejects.
 */
export async function sendSlackMessage(options: SlackMessageOptions): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  // No webhook configured — warn and skip.
  if (!webhookUrl) {
    console.warn('[slack] SLACK_WEBHOOK_URL is not set — skipping notification');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: options.text ?? '',
        blocks: options.blocks,
      }),
    });

    if (!response.ok) {
      console.error('[slack] Webhook returned', response.status, response.statusText);
    }
  } catch {
    // Network errors, DNS failures, etc. — swallow and continue.
  }
}

/**
 * Build and fire a Slack Block Kit notification for a batch of newly created tickets.
 *
 * Fire-and-forget: callers use `void notifySlack(tickets)`.
 * Requires `SLACK_WEBHOOK_URL` in the environment.
 * Never throws — all errors are logged and swallowed.
 *
 * @param tickets - The newly created conflict tickets.
 */
export async function notifySlack(tickets: Ticket[]): Promise<void> {
  const n = tickets.length;
  if (n === 0) return;

  const bulletLines = tickets.map(
    (t) =>
      `• *${t.id}* — \`${t.file}\` | ${t.status} | confidence: ${Math.round(t.confidence * 100)}%`
  );

  await sendSlackMessage({
    text: `🎫 ${n} new conflict ticket${n === 1 ? '' : 's'} created`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🎫 ${n} new conflict ticket${n === 1 ? '' : 's'} created`, emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: bulletLines.join('\n') || '_No tickets._',
        },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Generated at ${new Date().toISOString()}` }],
      },
    ],
  });
}
