package com.project.backend.util;

import com.project.backend.DTO.GlobalResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class GlobalMessage {


    public ResponseEntity<GlobalResponse> GlobalMessageHandler(Boolean process, String message, HttpStatus status) {
        GlobalResponse res = GlobalResponse.builder()
                .process(process)
                .message(message)
                .build();
        return ResponseEntity.status(status != null ? status : HttpStatus.OK).body(res);
    }

}

