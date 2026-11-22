import { AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'خطای غیرمنتظره در نمایش برنامه',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('KaloriShomar ErrorBoundary caught an error:', error, info)
  }

  private handleEmergencyBackup = () => {
    try {
      const payload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        goals: JSON.parse(window.localStorage.getItem('kalorishomar_v1_goals') ?? 'null'),
        foods: JSON.parse(window.localStorage.getItem('kalorishomar_v1_foods') ?? '[]'),
        entries: JSON.parse(window.localStorage.getItem('kalorishomar_v1_entries') ?? '[]'),
        waterByDate: JSON.parse(window.localStorage.getItem('kalorishomar_v1_water') ?? '{}'),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kalorishomar-emergency-backup.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // Ignore storage access errors in emergency handler
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        dir="rtl"
        className="min-h-dvh bg-[#0C0C0D] text-[#FAFAFA] flex items-center justify-center p-4"
      >
        <div className="card-surface rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/12 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100">مشکلی در اجرای صفحه پیش آمد</h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              اطلاعات شما در حافظه مرورگر محفوظ است. می‌توانید ابتدا یک فایل پشتیبان دانلود کنید و
              سپس صفحه را دوباره بارگذاری کنید.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs py-2.5 px-4 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>بارگذاری مجدد</span>
            </button>
            <button
              type="button"
              onClick={this.handleEmergencyBackup}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E35] text-zinc-200 font-semibold text-xs py-2.5 px-4 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>دانلود پشتیبان اضطراری</span>
            </button>
          </div>
        </div>
      </div>
    )
  }
}
