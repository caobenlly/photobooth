package com.photobooth.controller;

import jakarta.annotation.PostConstruct;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.File;
import java.io.IOException;
import java.util.Base64;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import com.photobooth.service.RemoteCaptureService;
import com.photobooth.service.PrintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.util.Comparator;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

@RestController
@RequestMapping("/api/photo")
public class PhotoController {

    @Autowired
    private RemoteCaptureService captureService;

    @Autowired
    private PrintService printService;

    @Value("${dslr.capture.folder:C:/Users/Admin/Pictures}")
    private String dslrFolder;

    @Value("${camera.type:sony}")
    private String cameraType;

    private static final String UPLOAD_DIR = "src/main/resources/static/assets/photos";

    public PhotoController() {
    }

    @PostConstruct
    public void init() {
        // Create the upload directory if it doesn't exist
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        System.out.println("[INIT] DSLR Folder is: " + dslrFolder);
    }

    @GetMapping("/config")
    public ResponseEntity<java.util.Map<String, Object>> getConfig() {
        java.util.Map<String, Object> config = new java.util.HashMap<>();
        config.put("dslrFolder", dslrFolder);
        config.put("folderExists", new File(dslrFolder).exists());

        // Check if Remote.exe or EOS Utility is running
        boolean remoteRunning = false;
        try {
            String processSearch = cameraType.equalsIgnoreCase("sony") ? "Remote.exe" : "EOS Utility*";
            Process p = Runtime.getRuntime().exec("tasklist /FI \"IMAGENAME eq " + processSearch + "\"");
            java.util.Scanner s = new java.util.Scanner(p.getInputStream()).useDelimiter("\\A");
            String output = s.hasNext() ? s.next() : "";
            output = output.toLowerCase();
            remoteRunning = output.contains("remote.exe") || output.contains("eos utility")
                    || output.contains("eos utility 3");
        } catch (Exception e) {
        }
        config.put("remoteRunning", remoteRunning);
        config.put("cameraType", cameraType);

        try {
            java.net.InetAddress ip = java.net.InetAddress.getLocalHost();
            config.put("serverIp", ip.getHostAddress());
        } catch (Exception e) {
            config.put("serverIp", "localhost");
        }

        return ResponseEntity.ok(config);
    }

    @GetMapping("/get-ip")
    public ResponseEntity<String> getServerIp() {
        try {
            return ResponseEntity.ok(java.net.InetAddress.getLocalHost().getHostAddress());
        } catch (Exception e) {
            return ResponseEntity.ok("localhost");
        }
    }

    @PostMapping("/trigger-dslr")
    public ResponseEntity<String> triggerDslr() {
        try {
            System.out.println("[TRIGGER] Executing shutter script for " + cameraType + "...");
            String scriptFile = cameraType.equalsIgnoreCase("canon") ? "trigger_canon.ps1" : "trigger_sony.ps1";
            ProcessBuilder pb = new ProcessBuilder("powershell.exe", "-ExecutionPolicy", "Bypass", "-File",
                    scriptFile);
            pb.inheritIO();
            Process p = pb.start();
            int exitCode = p.waitFor();

            if (exitCode == 0) {
                return ResponseEntity.ok("Shutter triggered");
            } else {
                return ResponseEntity.internalServerError()
                        .body("Failed to trigger shutter. Is " + cameraType + " software running?");
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/capture-dslr")
    public ResponseEntity<String> captureDslr() {
        try {
            captureService.triggerCapture();
            return ResponseEntity.ok("Capture triggered");
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to trigger DSLRCam: " + e.getMessage());
        }
    }

    @GetMapping("/latest-dslr")
    public ResponseEntity<String> getLatestDslr() {
        File dir = new File(dslrFolder);
        if (!dir.exists()) {
            System.out.println("[WARN] Folder does not exist: " + dslrFolder);
            return ResponseEntity.notFound().build();
        }

        File[] files = dir
                .listFiles((d, name) -> name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".png"));

        if (files == null || files.length == 0) {
            return ResponseEntity.notFound().build();
        }

        // Sort by last modified
        Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
        File latest = files[0];

        // Return only the filename
        return ResponseEntity.ok(latest.getName());
    }

    @GetMapping("/view-dslr/{filename}")
    public ResponseEntity<Resource> viewDslr(@PathVariable("filename") String filename) {
        File file = new File(dslrFolder, filename);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(resource);
    }

    @PostMapping("/print/{filename}")
    public ResponseEntity<String> printPhoto(@PathVariable("filename") String filename) {
        File file = new File(dslrFolder, filename);
        if (!file.exists()) {
            file = new File(UPLOAD_DIR, filename);
        }

        if (!file.exists()) {
            System.err.println("[ERROR] File not found for printing: " + filename);
            return ResponseEntity.status(404).body("File not found: " + filename);
        }

        try {
            printService.printImage(file);
            return ResponseEntity.ok("Print job sent");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to print: " + e.getMessage());
        }
    }

    @PostMapping("/save")
    public ResponseEntity<String> savePhoto(@RequestBody PhotoRequest request) {
        try {
            String imageData = request.getImageData();
            // Data URI format: data:image/png;base64,...
            String[] parts = imageData.split(",");
            String imageString = parts[1];
            byte[] imageBytes = Base64.getDecoder().decode(imageString);

            String fileName = UUID.randomUUID().toString() + ".png";
            Path filePath = Paths.get(UPLOAD_DIR, fileName);
            Files.write(filePath, imageBytes);

            return ResponseEntity.ok("/assets/photos/" + fileName);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to save photo: " + e.getMessage());
        }
    }

    public static class PhotoRequest {
        private String imageData;

        public String getImageData() {
            return imageData;
        }

        public void setImageData(String imageData) {
            this.imageData = imageData;
        }
    }
}
