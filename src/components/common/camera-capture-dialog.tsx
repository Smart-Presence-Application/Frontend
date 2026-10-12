import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CameraOff, LoaderCircle, RotateCcw, Send, SwitchCamera } from "lucide-react"

import { FormAlert } from "@/components/admin/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Shot {
  blob: Blob
  url: string
  takenAt: string
}

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  pending: boolean
  error?: string | null
  onSubmit: (image: Blob, capturedAt: string) => void
  facingMode?: "user" | "environment"
  faceGuide?: boolean
  hint?: string
}

/**
 * Live camera capture. For check-in there is deliberately no file picker: the
 * backend only accepts a photo taken moments before it is uploaded, so `onSubmit`
 * receives the capture time. `facingMode` picks the front camera for selfies or the
 * back one for classrooms; `faceGuide` draws the face-in-oval guide.
 */
export function CameraCaptureDialog(props: CameraCaptureDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !props.pending && props.onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        {props.open && <CameraBody {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function cameraError(err: unknown) {
  const name = err instanceof DOMException ? err.name : ""
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access was blocked. Allow the camera for this site in your browser settings and try again."
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device."
  if (name === "NotReadableError") return "The camera is being used by another app. Close it and try again."
  return "The camera could not be started."
}

/**
 * Only the front camera is mirrored, and the saved photo matches the mirrored preview.
 * The video stays mounted so a retake can reattach the stream straight away.
 */
function CameraBody({ onOpenChange, submitLabel, pending, error, onSubmit, facingMode = "user", faceGuide, hint }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [cameraIssue, setCameraIssue] = useState<string | null>(null)
  const [shot, setShot] = useState<Shot | null>(null)
  const [facing, setFacing] = useState(facingMode)
  const mirror = facing === "user"

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const start = useCallback(async () => {
    setCameraIssue(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraIssue("This browser cannot open the camera. Use a recent version of Chrome, Edge, Safari or Firefox over HTTPS.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch (err) {
      setCameraIssue(cameraError(err))
    }
  }, [facing])

  useEffect(() => {
    void start()
    return stop
  }, [start, stop])

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url)
  }, [shot])

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    if (mirror) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    const takenAt = new Date().toISOString()
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setShot({ blob, url: URL.createObjectURL(blob), takenAt })
        stop()
      },
      "image/jpeg",
      0.9
    )
  }

  function retake() {
    setShot(null)
    void start()
  }

  return (
    <>
      <div className="grid gap-4">
        <FormAlert message={cameraIssue ?? error} />
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted">
          <video ref={videoRef} playsInline muted className={cn("size-full object-cover", mirror && "-scale-x-100", shot && "hidden")} aria-label="Camera preview" />
          {shot && <img src={shot.url} alt="Your photo" className="absolute inset-0 size-full object-cover" />}
          {!shot && !ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              {cameraIssue ? <CameraOff className="size-6" /> : <LoaderCircle className="size-6 animate-spin" />}
              {cameraIssue ? "Camera unavailable" : "Starting camera"}
            </div>
          )}
          {!shot && ready && (
            <Button
              type="button"
              size="icon-lg"
              variant="secondary"
              onClick={() => {
                stop()
                setFacing((f) => (f === "user" ? "environment" : "user"))
              }}
              aria-label="Switch camera"
              className="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur"
            >
              <SwitchCamera />
            </Button>
          )}
          {!shot && ready && faceGuide && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/4 w-1/2 rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgb(0_0_0/0.25)]" />
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {shot ? "Check the photo is clear, then use it." : (hint ?? "Hold steady in good light, then take the photo.")}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          Cancel
        </Button>
        {shot ? (
          <>
            <Button variant="outline" onClick={retake} disabled={pending}>
              <RotateCcw /> Retake
            </Button>
            <Button onClick={() => onSubmit(shot.blob, shot.takenAt)} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
              {submitLabel}
            </Button>
          </>
        ) : cameraIssue ? (
          <Button onClick={() => void start()}>
            <RotateCcw /> Try again
          </Button>
        ) : (
          <Button onClick={capture} disabled={!ready}>
            <Camera /> Take photo
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
