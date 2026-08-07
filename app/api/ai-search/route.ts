import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_USER_LOCATION, estimateEtaMinutes, haversineMiles } from '@/lib/geo';

// Structured output schema (Zod, per the Anthropic API skill's recommended
// approach) — client.messages.parse() validates the response against this
// automatically, and .parsed_output comes back typed to match, no free-form
// JSON parsing needed.
const AiSearchResult = z.object({
  message: z
    .string()
    .describe(
      "One short, friendly sentence introducing the results — reference what the customer actually asked for."
    ),
  productIds: z
    .array(z.string())
    .describe(
      'IDs of catalog products that genuinely match the request, most relevant first. Empty array if nothing in the catalog fits well — do not force a match.'
    ),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const products = await prisma.product.findMany({ include: { store: true } });

  // Catalog is small enough (a couple dozen items) to just hand the whole
  // thing to the model as context rather than building retrieval/embeddings
  // infrastructure for it.
  const catalog = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.priceCents / 100,
    store: p.store.name,
  }));

  let response;
  try {
    const client = new Anthropic();
    response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 1024,
      // Latency-sensitive UI search over a small catalog — not an
      // intelligence-sensitive task, so low effort is the right tradeoff.
      output_config: {
        effort: 'low',
        format: zodOutputFormat(AiSearchResult),
      },
      system:
        "You are SHOPPR AI, matching a customer's request to relevant products in a small local catalog. Only recommend items actually present in the catalog below — never invent products or mention items that aren't listed. If nothing in the catalog genuinely fits, return an empty productIds array and say so plainly in the message.",
      messages: [
        {
          role: 'user',
          content: `Catalog:\n${JSON.stringify(catalog)}\n\nCustomer request: "${prompt}"`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'AI search is not configured — add ANTHROPIC_API_KEY to .env' },
        { status: 503 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI search failed: ${err.message}` }, { status: 502 });
    }
    // The SDK throws a plain Error (not AuthenticationError) when it can't
    // resolve any credentials at all — no API key, no auth token, no CLI
    // profile — before it ever makes a network call.
    if (err instanceof Error && err.message.includes('Could not resolve authentication method')) {
      return NextResponse.json(
        { error: 'AI search is not configured — add ANTHROPIC_API_KEY to .env' },
        { status: 503 }
      );
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    return NextResponse.json(
      { error: "AI search couldn't process that request" },
      { status: 422 }
    );
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    return NextResponse.json({ error: 'AI response could not be parsed' }, { status: 502 });
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  // Preserve the model's relevance ordering rather than DB order.
  const ordered = parsed.productIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return NextResponse.json({
    message: parsed.message,
    products: ordered.map((p) => {
      const distanceMiles = haversineMiles(PLACEHOLDER_USER_LOCATION, p.store);
      return {
        id: p.id,
        name: p.name,
        storeId: p.storeId,
        storeName: p.store.name,
        category: p.category,
        price: p.priceCents / 100,
        etaMinutes: estimateEtaMinutes(distanceMiles),
        description: p.description,
        imageUrl: p.imageUrl,
        sizes: p.sizes,
      };
    }),
  });
}
