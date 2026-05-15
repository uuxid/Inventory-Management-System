package com.inventory.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path uploadDir;
    private final String backendPublicUrl;

    public FileStorageService(@Value("${app.upload-dir:uploads}") String uploadDir,
                              @Value("${app.backend-public-url:http://192.168.1.11:8080}") String backendPublicUrl) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.backendPublicUrl = backendPublicUrl;
    }

    public String saveProductImage(MultipartFile file) {
        validateImage(file);
        try {
            Files.createDirectories(uploadDir);
            String originalName = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename();
            String extension = getExtension(originalName);
            String fileName = UUID.randomUUID() + extension;
            Path target = uploadDir.resolve(fileName);
            Files.copy(file.getInputStream(), target);
            return backendPublicUrl + "/uploads/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store image", e);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        String contentType = file.getContentType();
        boolean allowed = "image/png".equalsIgnoreCase(contentType)
                || "image/jpeg".equalsIgnoreCase(contentType)
                || "image/jpg".equalsIgnoreCase(contentType)
                || "image/webp".equalsIgnoreCase(contentType);
        if (!allowed) {
            throw new IllegalArgumentException("Only PNG, JPG, JPEG, or WEBP images are allowed");
        }
    }

    private String getExtension(String name) {
        int index = name.lastIndexOf('.');
        return index >= 0 ? name.substring(index) : "";
    }
}
