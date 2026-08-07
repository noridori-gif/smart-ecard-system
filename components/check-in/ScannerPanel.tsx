import Button from "@/components/ui/Button";
import CheckInIcon from "./CheckInIcons";

export default function ScannerPanel({
  scannerReady,
  checking,
  cameraError,
  onRetry,
}: {
  scannerReady: boolean;
  checking: boolean;
  cameraError: string | null;
  onRetry: () => void;
}) {
  return <section className="sep-card min-w-0 p-4 sm:p-6" aria-labelledby="scanner-title">
    <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckInIcon name="camera" /></span><div><h2 id="scanner-title" className="sep-card-title">QR Scanner</h2><p className="sep-secondary mt-1">Point the camera at the guest&apos;s QR code or use the upload option in the scanner.</p></div></div>
    {cameraError ? (
      <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-amber-700"><CheckInIcon name="warning" className="h-5 w-5" /></span>
        <p className="mt-3 font-bold text-amber-900">Camera unavailable</p>
        <p className="mt-1 text-sm text-amber-800">{cameraError}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="mt-4">Try camera again</Button>
      </div>
    ) : (
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e7e1d7] bg-stone-50 p-2 sm:p-3"><div id="qr-reader" className="w-full" />{!scannerReady && <p role="status" className="p-6 text-center text-sm text-slate-500">Requesting camera permission and starting scanner…</p>}</div>
    )}
    <div className="mt-4 flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${cameraError ? "bg-red-500" : scannerReady ? "bg-emerald-500" : "bg-amber-500"}`} /><span className="font-semibold text-slate-700">{cameraError ? "Camera unavailable — use manual entry" : scannerReady ? "Scanner ready" : "Camera permission pending"}</span>{checking && <span className="ml-auto text-emerald-700">Verifying pass…</span>}</div>
  </section>;
}
