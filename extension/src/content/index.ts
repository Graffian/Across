import { Readability } from "@mozilla/readability"
import type { ExtractedContent } from "../lib/types"

function extractPageContent(): ExtractedContent {
  const documentClone = document.cloneNode(true) as Document

  const reader = new Readability(documentClone)
  const article = reader.parse()

  const headings = extractHeadings(document)
  const codeBlocks = extractCodeBlocks(document)
  const textContent = article?.textContent || extractFallbackText(document)

  return {
    tabId: -1,
    url: window.location.href,
    title: article?.title || document.title,
    textContent,
    headings,
    codeBlocks,
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
    extractedAt: Date.now(),
  }
}

function extractHeadings(doc: Document): { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }[] {
  const headings: { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }[] = []
  const selectors = ["h1", "h2", "h3", "h4", "h5", "h6"]

  for (const selector of selectors) {
    const elements = doc.querySelectorAll(selector)
    for (const el of elements) {
      const text = el.textContent?.trim()
      if (text && text.length > 0) {
        headings.push({
          level: parseInt(selector[1]) as 1 | 2 | 3 | 4 | 5 | 6,
          text,
        })
      }
    }
  }

  return headings
}

function extractCodeBlocks(doc: Document): string[] {
  const blocks: string[] = []

  const preElements = doc.querySelectorAll("pre")
  for (const pre of preElements) {
    const code = pre.textContent?.trim()
    if (code && code.length > 20) {
      blocks.push(code)
    }
  }

  const codeElements = doc.querySelectorAll("code")
  for (const code of codeElements) {
    if (code.parentElement?.tagName !== "PRE") {
      const text = code.textContent?.trim()
      if (text && text.length > 20) {
        blocks.push(text)
      }
    }
  }

  return blocks
}

function extractFallbackText(doc: Document): string {
  const article = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector('[role="main"]')
  if (article) {
    return cleanText(article.textContent || "")
  }

  const paragraphs = doc.querySelectorAll("p")
  const texts = Array.from(paragraphs)
    .map((p) => p.textContent?.trim())
    .filter((t): t is string => !!t && t.length > 20)

  if (texts.length > 0) return texts.join("\n\n")

  return cleanText(doc.body?.innerText || "")
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTENT") {
    try {
      const content = extractPageContent()
      content.tabId = message.tabId
      sendResponse({ success: true, content })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Extraction failed",
      })
    }
  }
  return true
})

console.log("Across content script loaded")
