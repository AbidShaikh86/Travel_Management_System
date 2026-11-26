package com.project.backend.controller;

import com.project.backend.DTO.ForgotPaswordRequest;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.LoginRequest;
import com.project.backend.DTO.LoginResponse;
import com.project.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        LoginResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<GlobalResponse> logout(){
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(GlobalResponse.builder()
                .process(true)
                .message("Logged out successfully")
                .build()
        );
    }

    @PatchMapping("/forgot-password")
    public ResponseEntity<GlobalResponse> forgotPassword(@Valid ForgotPaswordRequest request){
        return this.authService.changePassword(request);
    }
}
