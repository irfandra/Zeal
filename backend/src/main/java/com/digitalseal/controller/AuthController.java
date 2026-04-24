package com.digitalseal.controller;

import com.digitalseal.dto.request.*;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.AuthResponse;
import com.digitalseal.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "Authentication", description = "Authentication and authorization endpoints for email and wallet-based login")
public class AuthController {
    
    private final AuthService authService;
    
    @Operation(
            summary = "Register with email and password",
            description = "Create a new user account using email and password. Returns JWT access token and refresh token upon successful registration."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "Registration successful",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409",
                    description = "Email already exists"
            )
    })
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> registerWithEmail(
            @Valid @RequestBody EmailRegisterRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("Registration request received for email: {}", request.getEmail());
        
        String deviceInfo = httpRequest.getHeader("User-Agent");
        String ipAddress = getClientIp(httpRequest);
        
        AuthResponse response = authService.registerWithEmail(request, deviceInfo, ipAddress);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Registration successful"));
    }
    
    @Operation(
            summary = "Login with email and password",
            description = "Authenticate user with email and password. Returns JWT access token and refresh token upon successful login."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Login successful",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Invalid credentials"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "423",
                    description = "Account locked due to too many failed attempts"
            )
    })
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithEmail(
            @Valid @RequestBody EmailLoginRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("Login request received for email: {}", request.getEmail());
        
        String deviceInfo = httpRequest.getHeader("User-Agent");
        String ipAddress = getClientIp(httpRequest);
        
        AuthResponse response = authService.loginWithEmail(request, deviceInfo, ipAddress);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }
    
    @Operation(
            summary = "Check wallet registration status",
            description = "Check if a wallet address is already registered in the database."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Wallet status checked successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid wallet address"
            )
    })
    @GetMapping("/wallet/check")
    public ResponseEntity<ApiResponse<AuthResponse>> checkWalletRegistration(
            @Parameter(description = "Ethereum wallet address (0x...)", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
            @RequestParam String address) {

        log.info("Wallet registration check request: {}", address);

        AuthResponse response = authService.checkWalletRegistration(address);

        return ResponseEntity.ok(ApiResponse.success(response, "Wallet status checked"));
    }

    @Operation(
            summary = "Get nonce for wallet authentication",
            description = "Generate a unique nonce for wallet signature verification. The nonce must be signed by the wallet to complete authentication."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Nonce generated successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid wallet address"
            )
    })
    @GetMapping("/wallet/nonce")
    public ResponseEntity<ApiResponse<AuthResponse>> getWalletNonce(
            @Parameter(description = "Ethereum wallet address (0x...)", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
            @RequestParam String address) {
        
        log.info("Nonce request for wallet: {}", address);
        
        AuthResponse response = authService.getWalletNonce(address);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Nonce generated"));
    }
    
    @Operation(
            summary = "Register with wallet signature",
            description = "Create a new user account using wallet signature verification. User must first obtain a nonce and sign it with their wallet."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "Wallet registered successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid signature or wallet data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409",
                    description = "Wallet already registered"
            )
    })
    @PostMapping("/wallet/register")
    public ResponseEntity<ApiResponse<AuthResponse>> registerWithWallet(
            @Valid @RequestBody WalletRegisterRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("Wallet registration request: {}", request.getWalletAddress());
        
        String deviceInfo = httpRequest.getHeader("User-Agent");
        String ipAddress = getClientIp(httpRequest);
        
        AuthResponse response = authService.registerWithWallet(request, deviceInfo, ipAddress);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Wallet registered successfully"));
    }
    
    @Operation(
            summary = "Login with wallet signature",
            description = "Authenticate user using wallet signature verification. User must first obtain a nonce and sign it with their wallet."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Login successful"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Invalid signature or wallet not found"
            )
    })
    @PostMapping("/wallet/login")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithWallet(
            @Valid @RequestBody WalletLoginRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("Wallet login request: {}", request.getWalletAddress());
        
        String deviceInfo = httpRequest.getHeader("User-Agent");
        String ipAddress = getClientIp(httpRequest);
        
        AuthResponse response = authService.loginWithWallet(request, deviceInfo, ipAddress);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }
    
    @Operation(
            summary = "Refresh access token",
            description = "Obtain a new access token using a valid refresh token. The old access token is invalidated."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Token refreshed successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Invalid or expired refresh token"
            )
    })
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("Token refresh request");
        
        String deviceInfo = httpRequest.getHeader("User-Agent");
        String ipAddress = getClientIp(httpRequest);
        
        AuthResponse response = authService.refreshToken(request.getRefreshToken(), deviceInfo, ipAddress);
        
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
    }
    
    @Operation(
            summary = "Logout",
            description = "Invalidate the current refresh token and logout the user. The access token will remain valid until expiration."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Logged out successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid refresh token"
            )
    })
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody RefreshTokenRequest request) {
        
        log.info("Logout request");
        
        authService.logout(request.getRefreshToken());
        
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }
    
    @Operation(
            summary = "Verify email",
            description = "Verify the authenticated user's email address using a 6-digit code sent to their email after registration."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Email verified successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid or expired code"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            Authentication authentication,
            @Valid @RequestBody VerifyEmailRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Email verification request for user ID: {}", userId);
        authService.verifyEmail(userId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Email verified successfully"));
    }
    
    @Operation(
            summary = "Resend verification email",
            description = "Resend the 6-digit verification code to the authenticated user's email address."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Verification email sent"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Email already verified or no email on account"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Resend verification request for user ID: {}", userId);
        authService.resendVerificationEmail(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Verification email sent"));
    }
    
    @Operation(
            summary = "Forgot password",
            description = "Send a 6-digit password reset code to the provided email address. Always returns success to prevent email enumeration."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "If the email exists, a reset code has been sent"
            )
    })
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Forgot password request for email: {}", request.getEmail());
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "If the email exists, a reset code has been sent"));
    }
    
    @Operation(
            summary = "Reset password",
            description = "Reset the user's password using the 6-digit code sent to their email."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Password reset successful"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid or expired code"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Invalid email or code"
            )
    })
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        log.info("Reset password request for email: {}", request.getEmail());
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successful"));
    }
    
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
