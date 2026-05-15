package com.inventory.dto;
import lombok.*;
import java.time.LocalDateTime;
@Data @Builder
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
