package com.project.backend.controller;

import com.project.backend.util.StoreFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final StoreFile storeFile;

    public FileController(StoreFile storeFile) {
        this.storeFile = storeFile;
    }

    @GetMapping("/{subFolder}/{fileName}")
    public ResponseEntity<Resource> getFile(@PathVariable Long subFolder, @PathVariable String fileName) throws IOException {
        String relativePath = subFolder + "/" + fileName;
        Resource file = storeFile.load(relativePath);
        String contentType = Files.probeContentType(Paths.get(file.getFile().getAbsolutePath()));
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(file);
    }
}
