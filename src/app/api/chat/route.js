import { NextResponse } from 'next/server';
import ollama from 'ollama';

export async function POST(request) {
  try {
    const { message } = await request.json();

    const response = await ollama.chat({
      model: 'gemma:2b',
      messages: [{ role: 'user', content: message }],
      stream: false,
    });

    return NextResponse.json({ response: response.message?.content });
  } catch (error) {
    console.error('Ollama error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI response' },
      { status: 500 }
    );
  }
}