package com.project.backend.service;

import com.project.backend.DTO.ForgotPaswordRequest;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.LoginRequest;
import com.project.backend.DTO.LoginResponse;
import com.project.backend.config.ApplicationConfig;
import com.project.backend.model.Enumerator.AuditEntityType;
import com.project.backend.model.UserAuth;
import com.project.backend.repository.UserAuthRepository;
import com.project.backend.util.GlobalMessage;
import com.project.backend.util.JwtService;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserAuthRepository userAuthRepository;
    private final JwtService jwtService;
    private final ApplicationConfig applicationConfig;
    private final GlobalMessage globalMessage;
    private final AuditService auditService;

    public LoginResponse login(LoginRequest loginRequest){
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        UserAuth userAuth = this.userAuthRepository.findByUser_Email(loginRequest.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + loginRequest.getEmail()));

        String token = jwtService.generateToken(userDetails, userAuth.getRole().name());

        this.auditService.log(
                AuditEntityType.USER_AUTH,
                userAuth.getId(),
                "LOGIN",
                "User logged in email=" + userAuth.getUser().getEmail()
                        + ", role=" + userAuth.getRole()
        );

        return LoginResponse.builder()
                .token(token)
                .email(userAuth.getUser().getEmail())
                .role(userAuth.getRole().name())
                .message("Login successful")
                .build();
    }

    @Transactional
    public ResponseEntity<GlobalResponse> changePassword(ForgotPaswordRequest request){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        UserAuth auth = this.userAuthRepository.findByUser_Email(email)
                .orElseThrow(() -> new RuntimeException("Please login first!"));

        if (!applicationConfig.passwordEncoder().matches(request.getOldPassword(), auth.getPasswordHash())){
            return this.globalMessage.GlobalMessageHandler(false, "Current password does not match", HttpStatus.BAD_REQUEST);
        }

        if (applicationConfig.passwordEncoder().matches(request.getNewPassword(), auth.getPasswordHash())){
            return this.globalMessage.GlobalMessageHandler(false, "new password must be unique!", HttpStatus.BAD_REQUEST);
        }

        auth.setPasswordHash(applicationConfig.passwordEncoder().encode(request.getNewPassword()));
        this.userAuthRepository.save(auth);
        this.auditService.log(
                AuditEntityType.USER_AUTH,
                auth.getId(),
                "CHANGE_PASSWORD",
                "Password changed for email=" + email
        );
        return this.globalMessage.GlobalMessageHandler(true, "Password has been changed", HttpStatus.ACCEPTED);
    }
}
