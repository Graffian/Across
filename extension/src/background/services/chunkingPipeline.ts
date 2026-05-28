import type { ContentChunk, ExtractedContent } from "../../lib/types"
import { CHUNK_SIZE_MAX, CHUNK_SIZE_MIN, CHUNK_OVERLAP_TARGET } from "../../lib/constants"
import { v4 as uuidv4 } from "uuid"
import { getEncoding } from "js-tiktoken"

const encoder = getEncoding("cl100k_base")

function countTokens(text: string): number {
  return encoder.encode(text).length
}

interface Section {
  heading: string
  level: number
  content: string
}

function splitIntoSections(content: string, headings: { level: number; text: string }[]): Section[] {
  if (headings.length === 0) {
    return [{ heading: "", level: 0, content }]
  }

  const sections: Section[] = []
  const lines = content.split("\n")
  let currentHeading = ""
  let currentLevel = 0
  let currentContent: string[] = []
  let headingIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)

    if (headingMatch) {
      if (currentContent.length > 0 || currentHeading) {
        sections.push({ heading: currentHeading, level: currentLevel, content: currentContent.join("\n").trim() })
      }
      currentHeading = headingMatch[2]
      currentLevel = headingMatch[1].length
      currentContent = []
      headingIndex++
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0 || currentHeading) {
    sections.push({ heading: currentHeading, level: currentLevel, content: currentContent.join("\n").trim() })
  }

  return sections
}

function splitSectionIntoChunks(
  section: Section,
  base: { tabId: number; url: string; title: string; timestamp: number }
): ContentChunk[] {
  const chunks: ContentChunk[] = []
  const paragraphs = section.content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  if (paragraphs.length === 0 && section.content.trim()) {
    paragraphs.push(section.content.trim())
  }

  let currentBatch: string[] = []
  let currentTokens = 0

  for (const para of paragraphs) {
    const paraTokens = countTokens(para)

    if (currentTokens + paraTokens > CHUNK_SIZE_MAX && currentTokens >= CHUNK_SIZE_MIN) {
      const content = currentBatch.join("\n\n")

      chunks.push({
        chunkId: uuidv4(),
        tabId: base.tabId,
        url: base.url,
        title: base.title,
        content,
        heading: section.heading,
        chunkIndex: chunks.length,
        tokenCount: currentTokens,
        timestamp: base.timestamp,
      })

      const overlapTexts: string[] = []
      let overlapTokens = 0
      for (let i = currentBatch.length - 1; i >= 0; i--) {
        const t = countTokens(currentBatch[i])
        if (overlapTokens + t > CHUNK_OVERLAP_TARGET) break
        overlapTexts.unshift(currentBatch[i])
        overlapTokens += t
      }

      currentBatch = [...overlapTexts]
      currentTokens = overlapTokens
    }

    currentBatch.push(para)
    currentTokens += paraTokens
  }

  if (currentBatch.length > 0) {
    chunks.push({
      chunkId: uuidv4(),
      tabId: base.tabId,
      url: base.url,
      title: base.title,
      content: currentBatch.join("\n\n"),
      heading: section.heading,
      chunkIndex: chunks.length,
      tokenCount: currentTokens,
      timestamp: base.timestamp,
    })
  }

  return chunks
}

export function chunkContent(extracted: ExtractedContent): ContentChunk[] {
  const base = {
    tabId: extracted.tabId,
    url: extracted.url,
    title: extracted.title,
    timestamp: extracted.extractedAt,
  }

  const sections = splitIntoSections(extracted.textContent, extracted.headings)
  const chunks: ContentChunk[] = []

  for (const section of sections) {
    const sectionChunks = splitSectionIntoChunks(section, base)
    chunks.push(...sectionChunks)
  }

  return chunks
}
