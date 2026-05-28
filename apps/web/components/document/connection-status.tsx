interface ConnectionStatusProps {
  connected: boolean
  finalized: boolean
  approved: boolean
}

export function ConnectionStatus({ connected, finalized, approved }: ConnectionStatusProps) {
  if (finalized && approved) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-success" />
        <span className="text-xs text-muted-foreground">Approved</span>
      </div>
    )
  }

  if (finalized) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="text-xs text-muted-foreground">Finalised</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground">
        {connected ? "Connected" : "Connecting..."}
      </span>
    </div>
  )
}
