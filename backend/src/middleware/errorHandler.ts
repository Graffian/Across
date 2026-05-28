import { Request, Response, NextFunction } from "express"
import rateLimit from "express-rate-limit"

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
}
