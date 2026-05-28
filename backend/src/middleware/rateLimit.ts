import rateLimit from "express-rate-limit"

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

export const embeddingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many embedding requests, please try again later" },
})

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many chat requests, please try again later" },
})

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many search requests, please try again later" },
})
