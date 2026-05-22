interface ConnectionStatusProps {
  connected: boolean
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground">
        {connected ? "Connected" : "Connecting..."}
      </span>
    </div>
  )
}
