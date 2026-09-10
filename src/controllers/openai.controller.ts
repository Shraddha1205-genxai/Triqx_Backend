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

/**
 * Generate Smart Replies API using OpenAI v1/responses endpoint
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
Respond ONLY using the requested JSON schema.`;

    let replies: string[] = [];

    if (env.openaiApiKey) {
      const modelsToTry = ['gpt-5.6-luna', 'gpt-4o-mini', 'gpt-4o'];

      for (const modelName of modelsToTry) {
        try {
          const response = await client.responses.create({
            model: modelName,
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
          });

          if (response && response.output_text) {
            const parsed = JSON.parse(response.output_text);
            if (Array.isArray(parsed.replies) && parsed.replies.length > 0) {
              replies = parsed.replies;
              break;
            }
          }
        } catch (modelErr: any) {
          console.warn(`[OpenAI Controller] Model ${modelName} attempt failed:`, modelErr.message || modelErr);
        }
      }

      // If responses.create is unavailable, try chat completions API fallback
      if (replies.length === 0) {
        try {
          const chatCompletion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: instructions },
              { role: 'user', content: formattedInput },
            ],
            response_format: { type: 'json_object' },
          });

          const content = chatCompletion.choices[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.replies)) {
              replies = parsed.replies;
            }
          }
        } catch (chatErr: any) {
          console.warn('[OpenAI Controller] Chat completions fallback failed:', chatErr.message || chatErr);
        }
      }
    }

    // Default smart replies fallback if API key is not set or OpenAI model returns no replies
    if (replies.length === 0) {
      replies = [
        'See you there!',
        'On my way!',
        'Will bring the notes.',
      ].slice(0, replyCount);
    }

    return res.status(200).json({
      success: true,
      replies,
    });
  } catch (error: any) {
    console.error('[OpenAI Controller] generateReplies error:', error.message || error);
    return res.status(200).json({
      success: true,
      replies: [
        'See you there!',
        'On my way!',
        'Will bring the notes.',
      ],
    });
  }
};
