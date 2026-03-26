package com.photobooth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.print.PrintException;
import java.io.File;
import java.awt.Desktop;
import java.io.IOException;
import java.util.Arrays;

@Service
public class PrintService {

    @Value("${printer.name:Canon SELPHY CP1500}")
    private String printerName;

    public void printImage(File imageFile) throws PrintException, IOException {
        // List all available printers for debugging
        System.out.println("[PRINT] --- Available Printers on System ---");
        javax.print.PrintService[] printServices = javax.print.PrintServiceLookup.lookupPrintServices(null, null);
        for (javax.print.PrintService service : printServices) {
            System.out.println("  > " + service.getName());
        }
        System.out.println("[PRINT] -------------------------------------");

        if (imageFile == null || !imageFile.exists()) {
            throw new IOException("File not found: " + (imageFile != null ? imageFile.getAbsolutePath() : "null"));
        }

        String path = imageFile.getAbsolutePath();
        System.out.println("[PRINT] >>> STARTING PRINT SEQUENCE FOR: " + path);
        System.out.println("[PRINT] Target Printer: " + printerName);

        // --- METHOD 1: CMD /C START /P ---
        // This is the most "native" way to trigger the associated "Print" command.
        try {
            System.out.println("[PRINT] Method 1: Attempting 'cmd /c start /p'...");
            Process p = new ProcessBuilder("cmd", "/c", "start", "/p", path).start();
            if (p.waitFor() == 0) {
                System.out.println("[PRINT] Method 1: Command executed.");
                // We don't return here because 'start' returns immediately, we want to try
                // others if it didn't actually print.
            }
        } catch (Exception e) {
            System.err.println("[PRINT] Method 1 failed: " + e.getMessage());
        }

        // --- METHOD 2: POWERSHELL START-PROCESS ---
        try {
            System.out.println("[PRINT] Method 2: Attempting PowerShell 'Print' verb...");
            String psCommand = String.format("Start-Process -FilePath '%s' -Verb Print", path);
            Process p = new ProcessBuilder("powershell", "-ExecutionPolicy", "Bypass", "-Command", psCommand).start();
            if (p.waitFor() == 0) {
                System.out.println("[PRINT] Method 2: Command executed.");
            }
        } catch (Exception e) {
            System.err.println("[PRINT] Method 2 failed: " + e.getMessage());
        }

        // --- METHOD 3: RUNDLL32 (Legacy Photo Printing Wizard) ---
        try {
            System.out.println("[PRINT] Method 3: Attempting rundll32 shimgvw.dll...");
            // This often opens the "Photo Printing Wizard"
            new ProcessBuilder("rundll32.exe", "shimgvw.dll,ImageView_PrintTo", path, printerName).start();
            System.out.println("[PRINT] Method 3: Command sent.");
        } catch (Exception e) {
            System.err.println("[PRINT] Method 3 failed: " + e.getMessage());
        }

        // --- METHOD 4: MSPAINT /PT (The "Nuclear" Option) ---
        try {
            System.out.println("[PRINT] Method 4: Attempting mspaint /pt...");
            // /pt <filename> <printername> <drivername> <portname>
            // On modern Windows, just <filename> <printername> is usually enough.
            new ProcessBuilder("mspaint", "/pt", path, printerName).start();
            System.out.println("[PRINT] Method 4: Command sent.");
        } catch (Exception e) {
            System.err.println("[PRINT] Method 4 failed: " + e.getMessage());
        }

        System.out.println("[PRINT] <<< PRINT SEQUENCE FINISHED. If nothing printed, check printer connection/queue.");
    }
}
