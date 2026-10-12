import { parseDiagramResponse, RawDiagramElement } from './diagramParser';
import {
  generateLocalDiagram,
  generateLocalSummary,
  generateLocalOptimize,
  generateLocalChat,
} from './localAIEngine';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIServiceConfig {
  endpoint: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/** Thrown when the proxy answered but the upstream provider rejected the call. */
export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly provider?: string,
    readonly model?: string
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

/** Thrown when the proxy itself could not be reached at all. */
export class AIUnreachableError extends Error {
  constructor(readonly endpoint: string) {
    super(
      `Cannot reach the AI proxy at ${endpoint}. Start it with "cd server && npm start", ` +
        `then confirm ${new URL(endpoint).origin}/health responds.`
    );
    this.name = 'AIUnreachableError';
  }
}

class AIService {
  private readonly config: Required<AIServiceConfig>;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      endpoint:
        import.meta.env.VITE_PROXY_URL ||
        (import.meta.env.DEV ? 'http://localhost:3001/api/chat' : '/api/chat'),
      retryAttempts: 2,
      retryDelay: 800,
      timeout: 8000,
      ...config,
    };
  }

  get endpoint(): string {
    return this.config.endpoint;
  }

  /** Cheap liveness probe — useful to call once when the palette opens. */
  async health(): Promise<{ ok: boolean; mode: 'cloud' | 'local'; detail?: unknown }> {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const url = new URL(this.config.endpoint, base);
      const healthPath = url.pathname.startsWith('/api') ? '/api/health' : '/health';
      const res = await fetch(`${url.origin}${healthPath}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const detail = await res.json();
        const hasProvider = detail?.openai || detail?.groq;
        return { ok: true, mode: hasProvider ? 'cloud' : 'local', detail };
      }
      return { ok: true, mode: 'local' };
    } catch {
      return { ok: true, mode: 'local' };
    }
  }

  /**
   * Fetches with a timeout and retry. Retries transport failures and 5xx only.
   */
  private async fetchWithRetry(
    init: RequestInit,
    attempts: number = this.config.retryAttempts
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        ...init,
        signal: controller.signal,
      });

      if (response.ok) return response;

      const body = await response.json().catch(() => ({}));

      if (response.status >= 500 && attempts > 1) {
        await new Promise((r) => setTimeout(r, this.config.retryDelay));
        return this.fetchWithRetry(init, attempts - 1);
      }

      throw new AIProviderError(
        body.message || body.error || `${response.status} ${response.statusText}`,
        response.status,
        body.code,
        body.provider,
        body.model
      );
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      if (attempts > 1) {
        await new Promise((r) => setTimeout(r, this.config.retryDelay));
        return this.fetchWithRetry(init, attempts - 1);
      }

      if (error instanceof TypeError) {
        throw new AIUnreachableError(this.config.endpoint);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async chat(request: AIRequest): Promise<string> {
    try {
      const response = await this.fetchWithRetry({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.warn('AI Cloud call failed, falling back to local assistant:', error);
      const lastUser = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';
      return generateLocalChat(lastUser);
    }
  }

  async summarizeCanvas(elementsJSON: string): Promise<string> {
    try {
      return await this.chat({
        messages: [
          {
            role: 'system',
            content: `You summarize diagrams concisely. Maximum 4 bullet points.`,
          },
          {
            role: 'user',
            content: `Summarize this canvas:\n${elementsJSON}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 300,
      });
    } catch {
      return generateLocalSummary(elementsJSON);
    }
  }

  async generateDiagram(prompt: string): Promise<RawDiagramElement[]> {
    try {
      const response = await this.chat({
        messages: [
          {
            role: 'system',
            content: `You are a Scriblio whiteboard diagram generator. You MUST respond with ONLY a valid JSON array.
CRITICAL RULES:
1. Output ONLY a JSON array starting with [ and ending with ]
2. NO markdown code blocks (no \`\`\`json or \`\`\`)
3. NO explanations before or after the JSON
4. Each element must have: type, x, y, width, height, strokeColor, backgroundColor
Valid element types: "rectangle", "ellipse", "diamond", "arrow", "line", "text"`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        maxTokens: 3000,
      });

      const parsed = parseDiagramResponse(response);
      if (parsed && parsed.length > 0) return parsed;
      return generateLocalDiagram(prompt);
    } catch (error) {
      console.info('Using built-in local diagram generator for prompt:', prompt, error);
      return generateLocalDiagram(prompt);
    }
  }

  async optimizeLayout(elementsJSON: string): Promise<string> {
    try {
      return await this.chat({
        messages: [
          {
            role: 'system',
            content: 'You provide practical layout and design improvements for diagrams.',
          },
          {
            role: 'user',
            content: `Analyze and suggest improvements:\n\n${elementsJSON}`,
          },
        ],
        maxTokens: 1200,
      });
    } catch {
      return generateLocalOptimize(elementsJSON);
    }
  }

  async generateContent(prompt: string, canvasContext?: string): Promise<string> {
    try {
      return await this.chat({
        messages: [
          {
            role: 'user',
            content: `${prompt}${canvasContext ? `\n\nCanvas context:\n${canvasContext}` : ''}`,
          },
        ],
        maxTokens: 2000,
      });
    } catch {
      return generateLocalChat(prompt);
    }
  }
}

export const aiService = new AIService();
export type { AIService };