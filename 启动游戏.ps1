$ErrorActionPreference = 'Stop'
$gameUrl = 'http://127.0.0.1:4173'
try { $null = Invoke-WebRequest -Uri $gameUrl -TimeoutSec 1 } catch {
    Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    for ($gameAttempt = 0; $gameAttempt -lt 20; $gameAttempt++) {
        Start-Sleep -Milliseconds 200
        try { $null = Invoke-WebRequest -Uri $gameUrl -TimeoutSec 1; break } catch { }
    }
}
Start-Process $gameUrl
