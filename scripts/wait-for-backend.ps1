# Wait for backend to be fully ready (health returns 200)
$url = "http://localhost:3001/api/health"
$maxAttempts = 60  # 60 * 1s = 60 seconds max
$attempt = 0

while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $body = $response.Content | ConvertFrom-Json
            if ($body.status -eq "ok") {
                Write-Host "Backend ready after $attempt seconds"
                exit 0
            }
        }
    } catch {}
    Start-Sleep -Seconds 1
    $attempt++
}

Write-Host "Backend not ready after $maxAttempts seconds"
exit 1
