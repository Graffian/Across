import { Request, Response, NextFunction } from "express"

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
}
