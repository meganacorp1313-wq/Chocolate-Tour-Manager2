import { useEffect, useRef, useState } from "react"
import { useCheckInBooking } from "@workspace/api-client-react"
import type { CheckInBooking200 } from "@workspace/api-client-react"
import { Html5Qrcode } from "html5-qrcode"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, QrCode, CheckCircle2, AlertTriangle, XCircle, Camera, CameraOff } from "lucide-react"
import { useI18n } from "@/lib/i18n"

type ResultState =
  | { kind: "success" | "already"; data: CheckInBooking200 }
  | { kind: "error"; message: string }
  | null

const READER_ID = "qr-reader"

export default function AdminCheckIn() {
  const { t, lang } = useI18n()
  const [manualCode, setManualCode] = useState("")
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [result, setResult] = useState<ResultState>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const startGenRef = useRef(0)
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 })
  const checkIn = useCheckInBooking()

  const doCheckIn = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase()
    if (!code || checkIn.isPending) return
    checkIn.mutate(
      { code },
      {
        onSuccess: (res) => {
          setResult({ kind: res.alreadyCheckedIn ? "already" : "success", data: res })
        },
        onError: (err) => {
          const status =
            typeof err === "object" && err !== null && "status" in err
              ? (err as { status?: number }).status
              : undefined
          if (status === 404) setResult({ kind: "error", message: t("checkin_not_found") })
          else if (status === 409) setResult({ kind: "error", message: t("checkin_not_confirmed") })
          else setResult({ kind: "error", message: t("checkin_error") })
        },
      },
    )
  }

  const stopScanner = async () => {
    startGenRef.current += 1
    const scanner = scannerRef.current
    scannerRef.current = null
    setScanning(false)
    if (scanner) {
      try {
        await scanner.stop()
        scanner.clear()
      } catch {
        // already stopped
      }
    }
  }

  const startScanner = async () => {
    setCameraError(false)
    setResult(null)
    setScanning(true)
    const gen = ++startGenRef.current
    try {
      const scanner = new Html5Qrcode(READER_ID)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const now = Date.now()
          // debounce: ignore repeats of the same code within 3s
          if (decoded === lastScanRef.current.code && now - lastScanRef.current.at < 3000) return
          lastScanRef.current = { code: decoded, at: now }
          doCheckIn(decoded)
        },
        () => {
          // per-frame decode failures are normal; ignore
        },
      )
      // If Stop was pressed (or the page unmounted) while start was pending,
      // this instance is no longer the active scanner — release the camera.
      if (startGenRef.current !== gen) {
        try {
          await scanner.stop()
          scanner.clear()
        } catch {
          // ignore
        }
      }
    } catch {
      if (startGenRef.current === gen) {
        setCameraError(true)
        await stopScanner()
      }
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    doCheckIn(manualCode)
  }

  const tourNameFor = (b: CheckInBooking200["booking"]) => {
    const localized = lang === "es" ? b.tourNameEs : lang === "en" ? b.tourNameEn : b.tourName
    return localized || b.tourName
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">{t("checkin_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("checkin_desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>{t("checkin_title")}</CardTitle>
              <CardDescription>{t("checkin_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id={READER_ID} className={scanning ? "rounded-lg overflow-hidden border" : "hidden"} />
          {cameraError && (
            <p className="text-sm text-destructive font-medium">{t("checkin_camera_error")}</p>
          )}
          <Button
            type="button"
            variant={scanning ? "outline" : "default"}
            onClick={() => (scanning ? void stopScanner() : void startScanner())}
            className="w-full"
          >
            {scanning ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            {scanning ? t("checkin_stop_scan") : t("checkin_start_scan")}
          </Button>

          <form onSubmit={handleManual} className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder={t("checkin_manual_placeholder")}
              className="font-mono tracking-widest"
            />
            <Button type="submit" disabled={checkIn.isPending || !manualCode.trim()}>
              {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("checkin_submit")}
            </Button>
          </form>

          {result?.kind === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
              <XCircle className="w-5 h-5 shrink-0" /> {result.message}
            </div>
          )}
          {(result?.kind === "success" || result?.kind === "already") && (
            <div
              className={`p-4 rounded-lg space-y-2 text-sm ${
                result.kind === "success" ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
              }`}
            >
              <p className={`flex items-center gap-2 font-semibold ${result.kind === "success" ? "text-green-700" : "text-amber-700"}`}>
                {result.kind === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {result.kind === "success" ? t("checkin_success") : t("checkin_already")}
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-foreground">
                <span className="text-muted-foreground">{t("booking_code")}</span>
                <span className="font-mono font-bold">{result.data.booking.code}</span>
                <span className="text-muted-foreground">{t("form_client_name")}</span>
                <span>{result.data.booking.customerName}</span>
                <span className="text-muted-foreground">{t("tours")}</span>
                <span>{tourNameFor(result.data.booking)}</span>
                <span className="text-muted-foreground">{t("date")}</span>
                <span>
                  {result.data.booking.date}, {result.data.booking.startTime}
                </span>
                <span className="text-muted-foreground">{t("guests")}</span>
                <span>{result.data.booking.peopleCount}</span>
                {result.data.booking.checkedInAt && (
                  <>
                    <span className="text-muted-foreground">{t("arrived_at")}</span>
                    <span>{new Date(result.data.booking.checkedInAt).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
