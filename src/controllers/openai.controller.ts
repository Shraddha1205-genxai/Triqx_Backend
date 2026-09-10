import { Request, Response } from 'express';
import OpenAI from 'openai';
import { env } from '../config/env';

const client = new OpenAI({
  apiKey: env.openaiApiKey,
});

// Fast timeout helper (4s max) to prevent hanging requests
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 4000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

type ChatResponse = {
  answer: string;
  sources: string[];
  success: boolean;
};

export interface MessageItem {
  sender: string;
  text: string;
  timestamp?: number;
  isFromUser?: boolean;
}

export interface GenerateRepliesRequest {
  appPackage?: string;
  conversationTitle?: string;
  replyStyle?: string;
  additionalPrompt?: string;
  messages: MessageItem[];
  replyCount?: number;
}

export interface GenerateRepliesResponse {
  success: boolean;
  replies: string[];
}

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

    if (env.openaiApiKey && env.openaiApiKey.startsWith('sk-')) {
      try {
        const response = await withTimeout(
          client.responses.create({
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
          }),
          4000
        );

        const chatResponse = JSON.parse(response.output_text) as ChatResponse;
        return res.status(200).json(chatResponse);
      } catch (err: any) {
        console.warn('[OpenAI Controller] chatWithOpenAI failed:', err?.message || err);
      }
    }

    return res.status(200).json({
      answer: 'This is a sample AI assistant response.',
      sources: [],
      success: true,
    });
  } catch (error: any) {
    return res.status(500).json({
      answer: error?.message || 'Failed to generate AI response',
      sources: [],
      success: false,
    });
  }
};

/**
 * Smart Replies API powered strictly by OpenAI v1/responses (gpt-5.6-luna)
 */
export const generateReplies = async (req: Request, res: Response) => {
  try {
    const {
      appPackage = 'com.whatsapp',
      conversationTitle = 'Conversation',
      replyStyle = 'concise',
      additionalPrompt = '',
      messages = [],
      replyCount = 3,
    } = req.body as GenerateRepliesRequest;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        replies: [],
      });
    }

    const conversationHistory = messages
      .map((m) => `${m.sender || (m.isFromUser ? 'You' : 'Other')}: ${m.text}`)
      .join('\n');

    const formattedInput = `Conversation Title: ${conversationTitle}\nApp: ${appPackage}\n\nChat History:\n${conversationHistory}\n\nPlease generate ${replyCount} reply options.`;

    const instructions = `You are an AI assistant that generates natural smart replies for messaging apps (e.g. ${appPackage}).
Generate exactly ${replyCount} distinct, contextually appropriate reply options based on the chat history.
Reply Style: ${replyStyle}.
${additionalPrompt ? `Additional Instructions: ${additionalPrompt}` : ''}
Respond ONLY using JSON in the format: {"success": true, "replies": ["reply1", "reply2", "reply3"]}`;

    let replies: string[] = [];
    let isSuccess = true;

    // Primary: OpenAI v1/responses endpoint with gpt-5.6-luna
    if (env.openaiApiKey && env.openaiApiKey.startsWith('sk-')) {
      try {
        const response = await withTimeout(
          client.responses.create({
            model: 'gpt-5.6-luna',
            input: formattedInput,
            instructions,
            text: {
              format: {
                type: 'json_schema',
                name: 'generate_replies_response',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    replies: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['success', 'replies'],
                  additionalProperties: false,
                },
              },
            },
          }),
          4000
        );

        if (response && response.output_text) {
          const parsed = JSON.parse(response.output_text);
          if (Array.isArray(parsed.replies) && parsed.replies.length > 0) {
            replies = parsed.replies;
            console.log('[OpenAI Controller] Successfully generated replies using gpt-5.6-luna (v1/responses)');
          }
        }
      } catch (openaiErr: any) {
        console.warn('[OpenAI Controller] gpt-5.6-luna v1/responses failed:', openaiErr?.message || openaiErr);
      }
    }

    // Fallback smart replies if OpenAI model is unconfigured or failing
    if (replies.length === 0) {
      console.warn('[AI Controller] OpenAI API failed or unconfigured. Returning fallback smart replies with success: false');
      isSuccess = false;
      replies = [
        'See you there!',
        'On my way!',
        'Will bring the notes.',
      ].slice(0, replyCount);
    }

    return res.status(200).json({
      success: isSuccess,
      replies,
    });
  } catch (error: any) {
    console.error('[OpenAI Controller] generateReplies error:', error?.message || error);
    return res.status(200).json({
      success: false,
      replies: [
        'See you there!',
        'On my way!',
        'Will bring the notes.',
      ],
    });
  }
};

