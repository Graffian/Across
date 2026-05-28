import React, { useState, useEffect } from "react"
import type { ExtensionSettings } from "../../lib/types"
import { DEFAULT_SETTINGS } from "../../lib/types"

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsPanel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
      if (response?.payload) setSettings(response.payload)
    })
  }, [open])

  if (!open) return null

  const update = (patch: Partial<ExtensionSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaved(false)
  }

  const handleSave = () => {
    chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED", payload: settings })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Settings</h2>
          <button onClick={onClose} className="text-lg text-slate-500 hover:text-slate-300">&times;</button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2.5">
            <div>
              <div className="text-sm text-slate-200">Backend AI</div>
              <div className="text-[11px] text-slate-500">Use Jina AI for real embeddings + LLM chat</div>
            </div>
            <button
              onClick={() => update({ backend: { ...settings.backend, enabled: !settings.backend.enabled } })}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                settings.backend.enabled ? "bg-across-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  settings.backend.enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div className="rounded-lg bg-slate-800 px-3 py-2.5">
            <label className="text-[11px] font-medium text-slate-500">Backend URL</label>
            <input
              type="text"
              value={settings.backend.baseUrl}
              onChange={(e) => update({ backend: { ...settings.backend, baseUrl: e.target.value } })}
              placeholder="http://localhost:3001"
              className="mt-1 w-full bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-across-600 py-2 text-sm font-medium text-white transition-colors hover:bg-across-500"
          >
            {saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
