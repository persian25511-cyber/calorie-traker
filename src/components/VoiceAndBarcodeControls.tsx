import { Camera, Check, Mic, MicOff, Plus, ScanBarcode, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { FoodItem } from '../types/nutrition'
import { findFoodByBarcode } from '../utils/persianFoodParser'
import { formatFaNumber, toAsciiDigits } from '../utils/persianFormat'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechCtor = new () => SpeechRecognitionInstance

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>
}

function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor
    webkitSpeechRecognition?: SpeechCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function getBarcodeDetectorCtor(): (new (opts?: { formats?: string[] }) => BarcodeDetectorLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike
  }
  return w.BarcodeDetector ?? null
}

interface VoiceAndBarcodeControlsProps {
  foods: FoodItem[]
  onAppendPhrase: (phrase: string) => void
  onRequestAddBarcodeFood: (barcode: string) => void
}

export function VoiceAndBarcodeControls({
  foods,
  onAppendPhrase,
  onRequestAddBarcodeFood,
}: VoiceAndBarcodeControlsProps) {
  const [speechSupported] = useState(() => Boolean(getSpeechRecognitionCtor()))
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number | null>(null)

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const closeBarcodeModal = useCallback(() => {
    stopCamera()
    setBarcodeModalOpen(false)
    setCameraError(null)
  }, [stopCamera])

  useFocusTrap(modalRef, barcodeModalOpen, closeBarcodeModal)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      stopCamera()
    }
  }, [stopCamera])

  const handleToggleVoice = () => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    try {
      const rec = new Ctor()
      rec.lang = 'fa-IR'
      rec.continuous = false
      rec.interimResults = false
      rec.onresult = (event) => {
        const lastIdx = event.results.length - 1
        const transcript = event.results[lastIdx]?.[0]?.transcript?.trim()
        if (transcript) {
          onAppendPhrase(transcript)
        }
      }
      rec.onerror = () => setIsListening(false)
      rec.onend = () => setIsListening(false)
      recognitionRef.current = rec
      setIsListening(true)
      rec.start()
    } catch {
      setIsListening(false)
    }
  }

  const startCameraScan = async () => {
    setCameraError(null)
    const Detector = getBarcodeDetectorCtor()
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'اسکن مستقیم دوربین در این مرورگر فعال نیست؛ کد روی بسته (مثلاً ۶۲۶...) را در کادر بالا وارد کنید.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setCameraActive(true)
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      }, 60)

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const raw = codes[0]?.rawValue?.trim()
          if (raw) {
            setBarcodeInput(raw)
            stopCamera()
          }
        } catch {
          // Ignore frame decode error
        }
      }, 450)
    } catch {
      setCameraError('دسترسی به دوربین داده نشد؛ می‌توانید شماره بارکد را دستی وارد کنید.')
    }
  }

  const cleanDigits = toAsciiDigits(barcodeInput).replace(/\D/g, '')
  const matchedBarcodeFood = cleanDigits.length >= 8 ? findFoodByBarcode(cleanDigits, foods) : null
  const sampleBarcodeFoods = foods.filter((f) => Boolean(f.barcode)).slice(0, 5)

  return (
    <div className="inline-flex items-center gap-1.5">
      {speechSupported && (
        <button
          type="button"
          id="voice-input-btn"
          onClick={handleToggleVoice}
          aria-label={isListening ? 'توقف ضبط صوتی' : 'ثبت صوتی فارسی'}
          title={isListening ? 'در حال شنیدن... برای توقف بزنید' : 'ثبت صوتی وعده به فارسی'}
          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            isListening
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
              : 'bg-[#1E1E22] hover:bg-[#282830] border-[#2C2C33] text-zinc-300'
          }`}
        >
          {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="hidden sm:inline">{isListening ? 'در حال شنیدن...' : 'صوتی'}</span>
        </button>
      )}

      <button
        type="button"
        id="open-barcode-scanner-btn"
        onClick={() => {
          setBarcodeInput('')
          setBarcodeModalOpen(true)
        }}
        aria-label="اسکن یا جستجوی بارکد محصول"
        title="اسکن بارکد محصولات بسته‌بندی ایران (۶۲۶)"
        className="inline-flex items-center gap-1 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2C2C33] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors"
      >
        <ScanBarcode className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">بارکد</span>
      </button>

      {barcodeModalOpen &&
        createPortal(
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="اسکن و جستجوی بارکد محصولات ایرانی"
            data-testid="barcode-scanner-modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeBarcodeModal()
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <div
              ref={modalRef}
              className="w-full max-w-md rounded-2xl bg-[#161618] border border-[#2C2C33] p-5 shadow-2xl space-y-4 animate-fade-up"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanBarcode className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    بارکدخوان محصولات بسته‌بندی ایران (۶۲۶)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeBarcodeModal}
                  aria-label="بستن پنجره بارکد"
                  className="w-8 h-8 rounded-lg bg-[#222228] text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="barcode-manual-input"
                  inputMode="numeric"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="شماره بارکد روی بسته (مثلاً ۶۲۶۰۱۰۱۲۰۰۱۱۲)"
                  className="flex-1 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-xs sm:text-sm text-zinc-100 tabular-nums-fa"
                />
                <button
                  type="button"
                  onClick={() => (cameraActive ? stopCamera() : void startCameraScan())}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] px-3 py-2.5 text-xs font-semibold text-sky-300"
                >
                  <Camera className="w-4 h-4" />
                  <span>{cameraActive ? 'توقف دوربین' : 'دوربین'}</span>
                </button>
              </div>

              {cameraActive && (
                <div className="rounded-xl overflow-hidden bg-black border border-[#2C2C33] aspect-video">
                  <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                </div>
              )}

              {cameraError && (
                <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 leading-relaxed">
                  {cameraError}
                </p>
              )}

              {/* Matched or Unmatched Result */}
              {cleanDigits.length >= 8 && (
                <div className="rounded-xl bg-[#0C0C0D] border border-[#26262E] p-3.5 text-xs">
                  {matchedBarcodeFood ? (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-zinc-100">{matchedBarcodeFood.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
                          هر ۱ {matchedBarcodeFood.defaultUnit} · در ۱۰۰ گرم: ~
                          {formatFaNumber(matchedBarcodeFood.per100g.kcal)} کالری
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid="use-barcode-food-btn"
                        onClick={() => {
                          onAppendPhrase(
                            `یک ${matchedBarcodeFood.defaultUnit} ${matchedBarcodeFood.name}`,
                          )
                          closeBarcodeModal()
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 text-[#051B11] font-bold px-3.5 py-2 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>افزودن به وعده</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-zinc-300">
                        این بارکد ({cleanDigits}) هنوز در بانک غذا نیست.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onRequestAddBarcodeFood(cleanDigits)
                          closeBarcodeModal()
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold px-3 py-1.5 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>تعریف محصول با این بارکد</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Sample Barcodes */}
              <div className="space-y-1.5 pt-1 border-t border-[#222229]">
                <span className="block text-[11px] text-zinc-400">
                  نمونه بارکدهای آماده آزمایش (سری ۶۲۶ ایران):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleBarcodeFoods.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBarcodeInput(f.barcode ?? '')}
                      className="rounded-lg bg-[#1E1E22] hover:bg-[#282830] px-2 py-1 text-[11px] text-zinc-300"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
