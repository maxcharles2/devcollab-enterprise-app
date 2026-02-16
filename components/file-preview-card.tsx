"use client"

import React from "react"

import { FileText, ImageIcon, FileSpreadsheet, Presentation, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FileAttachment } from "@/lib/types"

const fileIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-5 w-5 text-primary" />,
  doc: <FileText className="h-5 w-5 text-primary" />,
  pdf: <FileText className="h-5 w-5 text-destructive" />,
  pptx: <Presentation className="h-5 w-5 text-chart-2" />,
  xlsx: <FileSpreadsheet className="h-5 w-5 text-chart-2" />,
}

interface FilePreviewCardProps {
  file: FileAttachment
}

export function FilePreviewCard({ file }: FilePreviewCardProps) {
  const downloadUrl = file.storage_path
    ? `/api/files/download?path=${encodeURIComponent(file.storage_path)}`
    : null

  return (
    <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-border bg-card p-3 max-w-xs">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        {fileIcons[file.type] || <FileText className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-card-foreground">{file.name}</span>
        <span className="text-[11px] text-muted-foreground uppercase">{file.type} &middot; {file.size}</span>
      </div>
      {downloadUrl ? (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download={file.name} aria-label="Download">
            <Download className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 shrink-0 text-muted-foreground opacity-50"
          disabled
          aria-label="Download unavailable"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
