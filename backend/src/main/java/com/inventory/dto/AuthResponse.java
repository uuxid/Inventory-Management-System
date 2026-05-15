package com.inventory.dto;
import lombok.*;
@Data @Builder
public class AuthResponse {
    private String token;
    private Long userId;
    private String username;
    private String fullName;
    private String role;
}
