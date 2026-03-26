$canon = Get-Process | Where-Object { $_.MainWindowTitle -match "Remote Live View window" -or $_.MainWindowTitle -match "Remote Shooting" -or $_.ProcessName -eq "EOS Utility 3" } | Select-Object -First 1

if ($canon) {
    echo "[DEBUG] Found Canon process ($($canon.ProcessName)) with title '$($canon.MainWindowTitle)'. Focusing window..."
    $wshell = New-Object -ComObject WScript.Shell
    
    # Try to activate by Window Title first for better accuracy
    if ($canon.MainWindowTitle) {
        $wshell.AppActivate($canon.MainWindowTitle)
    } else {
        $wshell.AppActivate($canon.Id)
    }
    
    Sleep -Milliseconds 500
    echo "[DEBUG] Sending Shutter command (SPACE)..."
    # Space is the shutter trigger in EOS Utility Remote Shooting
    $wshell.SendKeys(" ")
} else {
    echo "[ERROR] Canon EOS Utility (Remote Shooting window) is not running!"
    exit 1
}
