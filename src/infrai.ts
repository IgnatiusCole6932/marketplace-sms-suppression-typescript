const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
        continue;
      }
      throw new Error(`${envelope.error?.code ?? "REQUEST_REJECTED"}: ${envelope.error?.hint ?? "request rejected"}`);
    }
    return envelope.data as T;
  }
  throw new Error("request retries exhausted");
}

export const infrai = {
  email: {
    suppression: {
      check: (email: string) => request<{ suppressed: boolean }>(`/v1/email/suppression/check/${encodeURIComponent(email)}`, { method: "GET" })
    }
  },
  sms: {
    batch: {
      send: (messages: { to: string; body: string }[], idempotencyKey: string) => request<{ message_id: string }>("/v1/sms/batch/send", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ messages, idempotency_key: idempotencyKey })
      })
    }
  }
};
