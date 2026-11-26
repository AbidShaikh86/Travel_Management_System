package com.project.backend.util;

import com.project.backend.DTO.reimbursement.ProofResponse;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Component;

@Component
public class StoreFile {
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "application/pdf", ".pdf");

    @Value("${app.upload-dir}")
    private String uploaddir;

    private Path root;

    @PostConstruct
    void init() throws IOException {
        root = Paths.get(uploaddir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public ProofResponse save(MultipartFile file, Long subFolder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String ext = ALLOWED_TYPES.get(file.getContentType());

        if (ext == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Only JPEG, PNG, WEBP images or PDF files are allowed");
        }

        String storedName = UUID.randomUUID() + ext;
        String relativePath = subFolder + "/" + storedName;
        Path target = resolveSafe(relativePath);

        Files.createDirectories(target.getParent());

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        String originalName = StringUtils.cleanPath(
                Objects.requireNonNullElse(file.getOriginalFilename(), "file" + ext));

        return ProofResponse.builder()
                .fileName(file.getOriginalFilename())
                .storedFileName(storedName)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .url("/api/files/" + relativePath)
                .build();
    }

    public Resource load(String relativePath) {
        Path path = resolveSafe(relativePath);
        if (!Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found on disk");
        }
        return new FileSystemResource(path);
    }

    public void delete(String relativePath) throws IOException {
        Files.deleteIfExists(resolveSafe(relativePath));
    }

    private Path resolveSafe(String relativePath){
        Path path = root.resolve(relativePath).normalize();
        if (!path.startsWith(root)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
        }
        return path;
    }
}
