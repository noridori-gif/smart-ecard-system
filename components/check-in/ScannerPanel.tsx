import CheckInIcon from "./CheckInIcons";

export default function ScannerPanel({
  scannerReady,
  cameraError,
  isChecking,
  controlsDisabled,
  onRetry,
  onGalleryClick,
  onSwitchCamera,
}: {
  scannerReady: boolean;
  cameraError: string | null;
  isChecking: boolean;
  controlsDisabled: boolean;
  onRetry: () => void;
  onGalleryClick: () => void;
  onSwitchCamera: () => void;
}) {
  return (
    <section className="sep-card overflow-hidden p-3 sm:p-4" aria-labelledby="scanner-title">
      <h2 id="scanner-title" className="sr-only">QR Scanner</h2>

      {/* The camera target (#qr-reader) stays mounted and visible at all times once
          started -- verifyQrToken already guards re-entry while a result is showing,
          so there is no need to hide the live feed between guests; it keeps scanning
          continuously, matching how a scanner is actually used at an event entrance. */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900">
        {cameraError ? (
          <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-3 p-8 text-center sm:min-h-[24rem]">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-500/15 text-amber-300"><CheckInIcon name="warning" className="h-6 w-6" /></span>
            <p className="font-bold text-white">Camera unavailable</p>
            <p className="max-w-sm text-sm text-white/70">{cameraError}</p>
            <button type="button" onClick={onRetry} className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-white/90">Try camera again</button>
          </div>
        ) : (
          <>
            <div id="qr-reader" className="min-h-[20rem] sm:min-h-[24rem] [&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:rounded-2xl [&_video]:object-cover" />

            {!scannerReady && (
              <div className="absolute inset-0 grid place-items-center bg-slate-900">
                <p role="status" className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
                  Starting camera…
                </p>
              </div>
            )}

            {scannerReady && (
              <>
                <div className="pointer-events-none absolute inset-x-4 top-4 rounded-xl bg-black/55 px-4 py-2.5 text-center backdrop-blur-sm sm:inset-x-10">
                  <p className="text-sm font-bold text-white">Point the camera at the QR code</p>
                  <p className="text-xs text-white/70">The guest details will appear automatically</p>
                </div>

                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="relative h-52 w-52 sm:h-64 sm:w-64">
                    <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-emerald-400" />
                    <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-emerald-400" />
                    <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-emerald-400" />
                    <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-emerald-400" />
                    <span className="sep-scan-line absolute inset-x-3 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-6 py-1 sm:gap-10">
        <button
          type="button"
          onClick={onGalleryClick}
          disabled={controlsDisabled || Boolean(cameraError)}
          aria-label="Scan from gallery"
          className="flex flex-col items-center gap-1.5 text-xs font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white"><CheckInIcon name="gallery" className="h-5 w-5" /></span>
          Scan from Gallery
        </button>

        <div className="flex flex-col items-center gap-1.5 text-xs font-bold text-emerald-700">
          <span className={`grid h-16 w-16 place-items-center rounded-full text-white shadow-lg ${cameraError ? "bg-slate-400" : "bg-emerald-600"}`}>
            <CheckInIcon name="camera" className="h-7 w-7" />
          </span>
          {cameraError ? "Camera off" : isChecking ? "Verifying…" : scannerReady ? "Scanning…" : "Starting…"}
        </div>

        <button
          type="button"
          onClick={onSwitchCamera}
          disabled={isChecking || Boolean(cameraError)}
          aria-label="Switch camera"
          className="flex flex-col items-center gap-1.5 text-xs font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white"><CheckInIcon name="refresh" className="h-5 w-5" /></span>
          Switch Camera
        </button>
      </div>
    </section>
  );
}
