package com.photobooth.service;

import org.springframework.stereotype.Service;
import java.io.IOException;

@Service
public class RemoteCaptureService {

    public void triggerCapture() throws IOException {
        // PowerShell command to find the Remote window and send ENTER
        String script = "$wshell = New-Object -ComObject WScript.Shell; " +
                "$proc = Get-Process Remote -ErrorAction SilentlyContinue; " +
                "if ($proc) { " +
                "  $wshell.AppActivate($proc.Id); " +
                "  Start-Sleep -m 200; " +
                "  $wshell.SendKeys('{ENTER}'); " +
                "}";

        ProcessBuilder pb = new ProcessBuilder("powershell.exe", "-Command", script);
        pb.start();
    }
}
