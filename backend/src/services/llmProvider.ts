import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"

dotenv.config()

export interface LLMProvider {
  chat(message: string, context: string): Promise<string>
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

  async chat(message: string, context: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Context from browser tabs:\n\n${context}\n\nQuestion: ${message}`,
        },
      ],
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

  async chat(message: string, context: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Context from browser tabs:\n\n${context}\n\nQuestion: ${message}` },
      ],
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

export class LocalLLMProvider implements LLMProvider {
  async chat(message: string, context: string): Promise<string> {
    const sources = context
      .split("\n---\n")
      .map((s) => {
        const lines = s.split("\n")
        return `${lines[0] || ""}\n${lines.slice(1).join("\n").trim().slice(0, 200)}`
      })
      .slice(0, 3)

    return `Based on your browser memory, here are the relevant sources:\n\n${sources.join("\n\n")}\n\nConnect the backend with an Anthropic or OpenAI key for full AI-powered answers.`
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
  } else {
    console.warn("No ANTHROPIC_API_KEY or OPENAI_API_KEY set, using local fallback")
    provider = new LocalLLMProvider()
  }

  return provider
}
