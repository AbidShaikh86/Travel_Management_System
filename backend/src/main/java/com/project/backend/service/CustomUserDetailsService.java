package com.project.backend.service;

import com.project.backend.model.UserAuth;
import com.project.backend.repository.UserAuthRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserAuthRepository userAuthRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserAuth userAuth = this.userAuthRepository.findByUser_Email(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + userAuth.getRole().name());

        return new User(
                userAuth.getUser().getEmail(),
                userAuth.getPasswordHash(),
                userAuth.isEnabled(),
                true,
                true,
                true,
                Collections.singletonList(authority)
        );
    }

}
