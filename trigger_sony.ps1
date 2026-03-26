$remote = Get-Process -Name Remote -ErrorAction SilentlyContinue
if ($remote) {
    echo "[DEBUG] Found Sony Remote process. Focusing window..."
    $wshell = New-Object -ComObject WScript.Shell
    $wshell.AppActivate($remote.Id)
    Sleep -Milliseconds 200
    echo "[DEBUG] Sending Shutter command (ENTER)..."
    $wshell.SendKeys("{ENTER}")
} else {
    echo "[ERROR] Sony Remote (Remote.exe) is not running!"
    exit 1
}
