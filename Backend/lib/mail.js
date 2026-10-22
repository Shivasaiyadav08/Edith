import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { APIError } from 'better-auth/api';
import { z } from 'zod';

export function mailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from)
    throw new Error('Set RESEND_API_KEY and RESEND_FROM_EMAIL in the backend environment.');
  const address = from.match(/^[^<>\r\n]+<([^<>\r\n]+)>$/)?.[1]?.trim() || from;
  if (!/^re_\S+$/.test(apiKey) || /[\r\n]/.test(from) || !z.email().safeParse(address).success)
    throw new Error(
      'Check RESEND_API_KEY and RESEND_FROM_EMAIL. Use an authorized sender on your verified domain.',
    );
  return { apiKey, from, address };
}

export function mailEnabled() {
  try {
    mailConfig();
    return true;
  } catch {
    return false;
  }
}

export function emailDeliveryLimited() {
  try {
    const { address } = mailConfig();
    // Resend's shared sender is for testing; Gmail domains cannot be verified by this app.
    return /@(resend\.dev|gmail\.com|googlemail\.com)$/i.test(address);
  } catch {
    return true;
  }
}

function deliveryError() {
  return new APIError('SERVICE_UNAVAILABLE', {
    code: 'EMAIL_DELIVERY_FAILED',
    message: 'Email could not be sent. Please try again shortly or contact support.',
  });
}

// All auth emails use HTTPS (port 443). Never log addresses, codes, tokens, or provider responses.
export async function sendMail(to, subject, text) {
  let config;
  try {
    config = mailConfig();
  } catch {
    console.error('Email delivery failed: RESEND_CONFIG_MISSING_OR_INVALID');
    throw deliveryError();
  }
  const idempotencyKey = randomUUID();
  const body = JSON.stringify({ from: config.from, to: [to], subject, text });
  // One bounded retry for transient failures; the same key prevents duplicate emails.
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    let result;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      result = await response.json().catch(() => null);
    } catch {
      if (!attempt) {
        await delay(250);
        continue;
      }
      console.error('Email delivery failed: RESEND_NETWORK_OR_TIMEOUT');
      throw deliveryError();
    }
    if (response.ok && typeof result?.id === 'string' && result.id) return { id: result.id };
    if (!attempt && (response.status === 429 || response.status >= 500)) {
      const seconds = Number(response.headers.get('retry-after'));
      await delay(Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 2000) : 500);
      continue;
    }
    console.error('Email delivery failed: RESEND_HTTP', response.status);
    throw deliveryError();
  }
}
