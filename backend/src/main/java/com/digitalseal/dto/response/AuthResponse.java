package com.digitalseal.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Authentication response containing JWT tokens and user information")
public class AuthResponse {
    @Schema(description = "JWT access token for API authentication", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    private String accessToken;
    
    @Schema(description = "JWT refresh token for obtaining new access tokens", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    private String refreshToken;
    
    @Schema(description = "Token type (always 'Bearer')", example = "Bearer")
    private String tokenType;
    
    @Schema(description = "Access token expiration time in seconds", example = "3600")
    private Long expiresIn;
    
    @Schema(description = "Authenticated user information")
    private UserResponse user;

    @Schema(description = "Nonce value for wallet signature (only for nonce requests)", example = "a1b2c3d4e5f6g7h8i9j0")
    private String nonce;
    
    @Schema(description = "Message to be signed by wallet (only for nonce requests)", 
            example = "Sign this message to authenticate with Digital Seal: a1b2c3d4e5f6g7h8i9j0")
    private String message;

    @Schema(description = "Whether wallet address is already registered (only for wallet check requests)", example = "true")
    private Boolean isRegistered;
}
