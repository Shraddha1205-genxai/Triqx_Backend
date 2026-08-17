import { Request, Response } from 'express';
import OpenAI from 'openai';
import { env } from '../config/env';

const client = new OpenAI({
  apiKey: env.openaiApiKey,
});

type ChatResponse = {
  answer: string;
  sources: string[];
  success: boolean;
};

export const chatWithOpenAI = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        answer: 'Message is required',
        sources: [],
        success: false,
      });
    }

    if (!env.openaiApiKey) {
      return res.status(500).json({
        answer: 'OPENAI_API_KEY is not configured',
        sources: [],
        success: false,
      });
    }

    const response = await client.responses.create({
      model: 'gpt-5.6-luna',
      input: message,
      instructions:
        'Respond using the requested JSON schema. Only include sources explicitly provided in the user message; otherwise use an empty array.',
      text: {
        format: {
          type: 'json_schema',
          name: 'rag_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              sources: {
                type: 'array',
                items: { type: 'string' },
              },
              success: { type: 'boolean' },
            },
            required: ['answer', 'sources', 'success'],
            additionalProperties: false,
          },
        },
      },
    });

    const chatResponse = JSON.parse(response.output_text) as ChatResponse;

    return res.status(200).json(chatResponse);
  } catch (error: any) {
    return res.status(500).json({
      answer: error?.message || 'Failed to generate AI response',
      sources: [],
      success: false,
    });
  }
};
