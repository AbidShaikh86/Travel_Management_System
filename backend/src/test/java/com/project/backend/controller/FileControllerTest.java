package com.project.backend.controller;

import com.project.backend.DTO.reimbursement.ProofResponse;
import com.project.backend.util.StoreFile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FileControllerTest {

    @TempDir
    Path tempDir;

    @Test
    void getFile_servesStoredJpegUsingProofUrlPath() throws Exception {
        StoreFile storeFile = new StoreFile();
        ReflectionTestUtils.setField(storeFile, "uploaddir", tempDir.toString());
        ReflectionTestUtils.invokeMethod(storeFile, "init");

        byte[] jpegBytes = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0 };
        MockMultipartFile upload = new MockMultipartFile(
                "file",
                "receipt-photo.jpg",
                "image/jpeg",
                jpegBytes
        );

        ProofResponse saved = storeFile.save(upload, 1L);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new FileController(storeFile)).build();

        mockMvc.perform(get(saved.getUrl()))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(jpegBytes));
    }
}
