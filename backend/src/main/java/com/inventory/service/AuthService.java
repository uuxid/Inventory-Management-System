package com.inventory.service;

import java.util.List;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.inventory.dto.AuthResponse;
import com.inventory.dto.CreateUserRequest;
import com.inventory.dto.LoginRequest;
import com.inventory.dto.UserDTO;
import com.inventory.model.User;
import com.inventory.model.enums.Role;
import com.inventory.repository.UserRepository;
import com.inventory.security.JwtUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authManager;
    private final AuditLogWriterService auditLogWriterService;

    public AuthResponse login(LoginRequest request) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getUsername(), user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority(user.getRole().name())));
        String token = jwtUtil.generateToken(userDetails);
        auditLogWriterService.logByUsername(
            user.getUsername(),
            "LOGIN_SUCCESS",
            "AUTH",
            user.getId(),
            null,
            "User logged in");
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    public void logout(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        userRepository.findByUsername(username).ifPresent(user ->
                auditLogWriterService.logByUsername(
                        username,
                        "LOGOUT",
                        "AUTH",
                        user.getId(),
                        null,
                        "User logged out"));
    }

    public UserDTO createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername()))
            throw new RuntimeException("Username already exists");
        if (userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("Email already exists");
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.valueOf(request.getRole()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .build();
        user = userRepository.save(user);
        auditLogWriterService.log(
            "CREATE_USER",
            "USER",
            user.getId(),
            null,
            "username=" + user.getUsername() + ", role=" + user.getRole().name());
        return mapToDTO(user);
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    private UserDTO mapToDTO(User u) {
        return UserDTO.builder()
                .id(u.getId()).username(u.getUsername())
                .email(u.getEmail()).fullName(u.getFullName())
                .role(u.getRole().name()).isActive(u.getIsActive())
                .createdAt(u.getCreatedAt()).build();
    }
}
