import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import type { Response } from 'express';

const MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0';

function getClient(): AnthropicBedrock {
  return new AnthropicBedrock({
    awsRegion: process.env.AWS_REGION || 'us-east-1',
  });
}

export async function chat(
  messages: Array<{ role: string; content: string }>,
  system: string,
): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: system || undefined,
    messages: messages as any,
  });

  return (response.content[0] as any).text;
}

export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  system: string,
  res: Response,
): Promise<void> {
  const client = getClient();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: system || undefined,
      messages: messages as any,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && (event.delta as any).type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: (event.delta as any).text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Stream error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
