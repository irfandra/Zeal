package com.digitalseal.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "User information response")
public class UserResponse {
    @Schema(description = "User's unique identifier", example = "1")
    private Long id;
    
    @Schema(description = "User's email address", example = "john.doe@example.com")
    private String email;
    
    @Schema(description = "User's first name", example = "John")
    private String firstName;
    
    @Schema(description = "User's last name", example = "Doe")
    private String lastName;
    
    @Schema(description = "User's phone number", example = "+1234567890")
    private String phoneNumber;
    
    @Schema(description = "User's Ethereum wallet address", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String walletAddress;
    
    @Schema(description = "User's role (OWNER or BRAND)", example = "OWNER")
    private String role;
    
    @Schema(description = "Authentication type (EMAIL or WALLET)", example = "EMAIL")
    private String authType;
    
    @Schema(description = "Whether email is verified", example = "true")
    private Boolean emailVerified;
    
    @Schema(description = "Whether wallet is verified", example = "false")
    private Boolean walletVerified;
    
    @Schema(description = "Account creation timestamp", example = "2026-02-07T10:30:00")
    private LocalDateTime createdAt;
    
    @Schema(description = "Last login timestamp", example = "2026-02-07T15:45:30")
    private LocalDateTime lastLoginAt;
}
