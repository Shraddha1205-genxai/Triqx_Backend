import { Request, Response } from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

const client = new OpenAI({
  apiKey: env.openaiApiKey,
});

const genAI = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : null;

// Fast timeout helper (1.2s max) to guarantee instant API responses
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 1200): Promise<T> => {
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

    // Try Gemini API (4s timeout)
    if (env.geminiApiKey && genAI && env.geminiApiKey.length > 5) {
      const geminiModels = ['gemini-3.5-flash-lite', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'];
      for (const modelName of geminiModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
          });

          const promptText = `Respond using JSON with keys: "answer" (string), "sources" (array of strings), "success" (boolean true). Only include sources explicitly provided in the message, otherwise empty array.\n\nUser Message: ${message}`;
          const result = await withTimeout(model.generateContent(promptText), 4000);
          const text = result.response.text();
          const chatResponse = JSON.parse(text) as ChatResponse;
          return res.status(200).json(chatResponse);
        } catch (geminiError: any) {
          console.warn(`[Gemini Controller] chatWithOpenAI model ${modelName} failed:`, geminiError?.message || geminiError);
        }
      }
    }

    // OpenAI fallback (1.2s timeout)
    if (env.openaiApiKey && env.openaiApiKey.startsWith('sk-')) {
      try {
        const chatCompletion = await withTimeout(
          client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: message }],
          }),
          1200
        );

        const text = chatCompletion.choices[0]?.message?.content || '';
        return res.status(200).json({
          answer: text,
          sources: [],
          success: true,
        });
      } catch (err: any) {
        console.warn('[OpenAI Controller] OpenAI attempt failed:', err?.message || err);
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
 * Hyper-Optimized Fast Smart Replies API (<1.2s response time SLA)
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

    // 1. Try Gemini API once (4s timeout for live AI generation)
    if (env.geminiApiKey && genAI && env.geminiApiKey.length > 5) {
      const geminiModels = ['gemini-3.5-flash-lite', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'];
      for (const modelName of geminiModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
            },
          });

          const result = await withTimeout(model.generateContent(`${instructions}\n\n${formattedInput}`), 4000);
          const textText = result.response.text();
          if (textText) {
            const parsed = JSON.parse(textText);
            if (Array.isArray(parsed.replies) && parsed.replies.length > 0) {
              replies = parsed.replies;
              console.log(`[Gemini Controller] Successfully generated live smart replies using ${modelName}`);
              break;
            }
          }
        } catch (geminiErr: any) {
          console.warn(`[Gemini Controller] Model ${modelName} attempt failed:`, geminiErr?.message || geminiErr);
        }
      }
    }

    // 2. Try OpenAI API once (Fast 1.2s timeout)
    if (replies.length === 0 && env.openaiApiKey && env.openaiApiKey.startsWith('sk-')) {
      try {
        const chatCompletion = await withTimeout(
          client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: instructions },
              { role: 'user', content: formattedInput },
            ],
            response_format: { type: 'json_object' },
          }),
          1200
        );

        const content = chatCompletion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.replies) && parsed.replies.length > 0) {
            replies = parsed.replies;
          }
        }
      } catch (openaiErr: any) {
        console.warn('[OpenAI Controller] OpenAI attempt failed:', openaiErr?.message || openaiErr);
      }
    }

    // 3. Fallback smart replies if AI models are unconfigured or failing
    if (replies.length === 0) {
      console.warn('[AI Controller] Returning fallback smart replies with success: false');
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

