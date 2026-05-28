import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"

dotenv.config()

export interface LLMProvider {
  chat(message: string, context: string, history?: { role: string; content: string }[]): Promise<string>
  summarize(content: string, title: string): Promise<{ summary: string; keyPoints: string[] }>
}

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions about browser tabs. You have access to content extracted from the user's browser tabs. Use the provided context to answer questions accurately and concisely. If the context doesn't contain relevant information, say so. Always cite which source/tab your answer comes from.`

export class AnthropicLLMProvider implements LLMProvider {
  private client: Anthropic
  private model: string

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    this.model = process.env.DEFAULT_MODEL || "claude-sonnet-4-20250514"
  }

  async chat(message: string, context: string, history?: { role: string; content: string }[]): Promise<string> {
    const msgs = (history || []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content }))
    msgs.push({
      role: "user",
      content: `Context from browser tabs:\n\n${context}\n\nQuestion: ${message}`,
    })
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: msgs,
    })

    const block = response.content[0]
    return block?.type === "text" ? block.text : "No response generated"
  }

  async summarize(content: string, title: string): Promise<{ summary: string; keyPoints: string[] }> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0.3,
      system: `You are a summarization assistant. Create a concise summary and extract key points from the provided content. Respond with valid JSON only, using keys "summary" (2-3 sentences string) and "keyPoints" (array of 3-5 bullet point strings).`,
      messages: [
        {
          role: "user",
          content: `Summarize this content titled "${title}":\n\n${content.slice(0, 12000)}`,
        },
      ],
    })

    const block = response.content[0]
    const text = block?.type === "text" ? block.text : '{"summary":"","keyPoints":[]}'
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")

    try {
      return JSON.parse(cleaned)
    } catch {
      return { summary: text.slice(0, 300), keyPoints: [] }
    }
  }
}

export class OpenAILLMProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.model = "gpt-4o-mini"
  }

  async chat(message: string, context: string, history?: { role: string; content: string }[]): Promise<string> {
    const msgs: { role: "system" | "user" | "assistant"; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT }]
    if (history) msgs.push(...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })))
    msgs.push({ role: "user", content: `Context from browser tabs:\n\n${context}\n\nQuestion: ${message}` })
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: msgs,
      temperature: 0.3,
      max_tokens: 4096,
    })
    return response.choices[0]?.message?.content || "No response generated"
  }

  async summarize(content: string, title: string): Promise<{ summary: string; keyPoints: string[] }> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `You are a summarization assistant. Create a concise summary and extract key points from the provided content. Return JSON with "summary" (2-3 sentences) and "keyPoints" (array of 3-5 bullet points).`,
        },
        { role: "user", content: `Summarize this content titled "${title}":\n\n${content.slice(0, 12000)}` },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    })
    const text = response.choices[0]?.message?.content || '{"summary":"","keyPoints":[]}'
    return JSON.parse(text)
  }
}

export class GroqLLMProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions"

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY!
    this.model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  }

  async chat(message: string, context: string, history?: { role: string; content: string }[]): Promise<string> {
    const msgs: { role: string; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT }]
    if (history) msgs.push(...history.map((h) => ({ role: h.role, content: h.content })))
    msgs.push({ role: "user", content: `Context from browser tabs:\n\n${context}\n\nQuestion: ${message}` })
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: msgs,
        max_tokens: 4096,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Groq error ${response.status}: ${body}`)
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content || "No response generated"
  }

  async summarize(content: string, title: string): Promise<{ summary: string; keyPoints: string[] }> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a summarization assistant. Create a concise summary and extract key points from the provided content. Return JSON with "summary" (2-3 sentences) and "keyPoints" (array of 3-5 bullet points).`,
          },
          { role: "user", content: `Summarize this content titled "${title}":\n\n${content.slice(0, 12000)}` },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Groq summarization error ${response.status}: ${body}`)
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content || '{"summary":"","keyPoints":[]}'
    try {
      return JSON.parse(text)
    } catch {
      return { summary: text.slice(0, 300), keyPoints: [] }
    }
  }
}

export class HuggingFaceLLMProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private baseUrl = "https://api-inference.huggingface.co/models"

  constructor() {
    this.apiKey = process.env.HF_API_TOKEN!
    this.model = process.env.HF_LLM_MODEL || "mistralai/Mistral-7B-Instruct-v0.3"
  }

  async chat(message: string, context: string, history?: { role: string; content: string }[]): Promise<string> {
    const msgs: { role: string; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT }]
    if (history) msgs.push(...history.map((h) => ({ role: h.role, content: h.content })))
    msgs.push({ role: "user", content: `Context from browser tabs:\n\n${context}\n\nQuestion: ${message}` })
    const response = await fetch(`${this.baseUrl}/${this.model}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: msgs,
        max_tokens: 4096,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HuggingFace error ${response.status}: ${body}`)
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content || "No response generated"
  }

  async summarize(content: string, title: string): Promise<{ summary: string; keyPoints: string[] }> {
    const response = await fetch(`${this.baseUrl}/${this.model}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a summarization assistant. Create a concise summary and extract key points from the provided content. Return JSON with "summary" (2-3 sentences) and "keyPoints" (array of 3-5 bullet points).`,
          },
          { role: "user", content: `Summarize this content titled "${title}":\n\n${content.slice(0, 12000)}` },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HuggingFace summarization error ${response.status}: ${body}`)
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content || '{"summary":"","keyPoints":[]}'
    try {
      return JSON.parse(text)
    } catch {
      return { summary: text.slice(0, 300), keyPoints: [] }
    }
  }
}

export class LocalLLMProvider implements LLMProvider {
  async chat(message: string, context: string, _history?: { role: string; content: string }[]): Promise<string> {
    const sources = context
      .split("\n---\n")
      .map((s) => {
        const lines = s.split("\n")
        return `${lines[0] || ""}\n${lines.slice(1).join("\n").trim().slice(0, 200)}`
      })
      .slice(0, 3)

    return `Based on your browser memory, here are the relevant sources:\n\n${sources.join("\n\n")}\n\nConnect the backend with an Anthropic, OpenAI, or Hugging Face key for full AI-powered answers.`
  }

  async summarize(_content: string, title: string): Promise<{ summary: string; keyPoints: string[] }> {
    return {
      summary: `Page about "${title}". Connect the backend with an API key for AI-powered summarization.`,
      keyPoints: [`Title: ${title}`],
    }
  }
}

let provider: LLMProvider | null = null

export function getLLMProvider(): LLMProvider {
  if (provider) return provider

  if (process.env.ANTHROPIC_API_KEY) {
    console.log("Using Anthropic Claude for chat + summarization")
    provider = new AnthropicLLMProvider()
  } else if (process.env.OPENAI_API_KEY) {
    console.log("Using OpenAI for chat + summarization")
    provider = new OpenAILLMProvider()
  } else if (process.env.GROQ_API_KEY) {
    console.log("Using Groq (free, Llama 3) for chat + summarization")
    provider = new GroqLLMProvider()
  } else if (process.env.HF_API_TOKEN) {
    console.log("Using Hugging Face for chat + summarization (free tier)")
    provider = new HuggingFaceLLMProvider()
  } else {
    console.warn("No API key set, using local fallback")
    provider = new LocalLLMProvider()
  }

  return provider
}
