package com.photobooth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/photo")
public class PhotoController {

    private static final String UPLOAD_DIR = "src/main/resources/static/assets/photos";

    public PhotoController() {
        // Create the upload directory if it doesn't exist
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
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
