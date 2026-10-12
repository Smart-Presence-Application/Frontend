import { useId, useRef, useState, type DragEvent } from "react"
import { Camera, FileText, ImageIcon, UploadCloud, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { CameraCaptureDialog } from "@/components/common/camera-capture-dialog"
import { Button } from "@/components/ui/button"
import { useObjectUrls } from "@/hooks/use-object-urls"
import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  label?: string
  hint?: string
  preview?: boolean
  invalid?: boolean
  camera?: boolean | "user" | "environment"
}

const hasCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia

/**
 * Drag-and-drop file picker. `preview` shows image thumbnails instead of a file list;
 * `camera` offers "Take a photo", on by default for image uploads (back camera), and
 * should be false where file names matter, e.g. bulk face matching.
 */
export function FileDropzone({
  files,
  onChange,
  accept,
  multiple,
  maxFiles = multiple ? 100 : 1,
  label = "Drop files here or click to browse",
  hint,
  preview,
  invalid,
  camera,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const imageUpload = !!accept && /image/.test(accept)
  const facing = camera === "user" ? "user" : "environment"
  const showCamera = hasCamera && imageUpload && camera !== false && files.length < maxFiles

  function addPhoto(blob: Blob) {
    const file = new File([blob], `camera-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`, { type: blob.type || "image/jpeg" })
    onChange(multiple ? [...files, file].slice(0, maxFiles) : [file])
    setCameraOpen(false)
  }

  function add(list: FileList | null) {
    if (!list?.length) return
    const incoming = Array.from(list)
    onChange(multiple ? [...files, ...incoming].slice(0, maxFiles) : incoming.slice(0, 1))
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    add(event.dataTransfer.files)
  }

  return (
    <div className="grid gap-3">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-all",
          dragging ? "scale-[1.01] border-primary bg-primary/5" : "border-input hover:border-primary/50 hover:bg-muted/40",
          invalid && "border-destructive/60"
        )}
      >
        <motion.span
          animate={dragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
          className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <UploadCloud className="size-5" />
        </motion.span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ""
          }}
        />
      </label>

      {showCamera && (
        <Button type="button" variant="outline" className="justify-self-start" onClick={() => setCameraOpen(true)}>
          <Camera /> Take a photo
        </Button>
      )}
      {showCamera && (
        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          title="Take a photo"
          description="Use the device camera instead of choosing a file."
          submitLabel="Use photo"
          pending={false}
          facingMode={facing}
          onSubmit={addPhoto}
        />
      )}

      {files.length > 0 &&
        (preview ? (
          <ThumbGrid files={files} onRemove={(i) => onChange(files.filter((_, j) => j !== i))} />
        ) : (
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {files.map((file, i) => (
                <motion.li
                  key={`${file.name}-${file.size}-${i}`}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="size-4 shrink-0 text-primary" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-primary" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => onChange(files.filter((_, j) => j !== i))}
                    aria-label={`Remove ${file.name}`}
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ))}
    </div>
  )
}

function ThumbGrid({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const urls = useObjectUrls(files)

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      <AnimatePresence initial={false}>
        {files.map((file, i) => (
          <motion.li
            key={`${file.name}-${file.size}-${i}`}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            {urls[i] && <img src={urls[i]} alt={file.name} className="size-full object-cover" />}
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{file.name}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${file.name}`}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
