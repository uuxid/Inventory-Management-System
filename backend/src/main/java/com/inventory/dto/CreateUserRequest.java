package com.inventory.dto;
import lombok.Data;
@Data
public class CreateUserRequest {
    private String username;
    private String email;
    private String password;
    private String role;
    private String fullName;
    private String phone;
}
