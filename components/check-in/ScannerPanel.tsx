import CheckInIcon from "./CheckInIcons";

export default function ScannerPanel({ scannerReady, checking }: { scannerReady: boolean; checking: boolean }) {
  return <section className="sep-card min-w-0 p-4 sm:p-6" aria-labelledby="scanner-title">
    <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckInIcon name="camera" /></span><div><h2 id="scanner-title" className="sep-card-title">QR Scanner</h2><p className="sep-secondary mt-1">Point the camera at the guest&apos;s QR code or use the upload option in the scanner.</p></div></div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#e7e1d7] bg-stone-50 p-2 sm:p-3"><div id="qr-reader" className="w-full" />{!scannerReady && <p role="status" className="p-6 text-center text-sm text-slate-500">Requesting camera permission and starting scanner…</p>}</div>
    <div className="mt-4 flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${scannerReady ? "bg-emerald-500" : "bg-amber-500"}`} /><span className="font-semibold text-slate-700">{scannerReady ? "Scanner ready" : "Camera permission pending"}</span>{checking && <span className="ml-auto text-emerald-700">Verifying pass…</span>}</div>
  </section>;
}
