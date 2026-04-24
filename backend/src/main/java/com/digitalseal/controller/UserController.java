package com.digitalseal.controller;

import com.digitalseal.dto.request.ChangePasswordRequest;
import com.digitalseal.dto.request.ConnectWalletRequest;
import com.digitalseal.dto.request.UpdateEmailRequest;
import com.digitalseal.dto.request.UpdateProfileRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.TransferRecipientResponse;
import com.digitalseal.dto.response.UserResponse;
import com.digitalseal.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "User", description = "User profile management endpoints")
@SecurityRequirement(name = "bearerAuth")
public class UserController {
    
    private final UserService userService;
    
    @Operation(
            summary = "Get current user profile",
            description = "Returns the authenticated user's profile information."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Profile retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Unauthorized"
            )
    })
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        UserResponse response = userService.getProfile(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Profile retrieved successfully"));
    }

    @Operation(
            summary = "Get transfer recipient users",
            description = "Returns active users (excluding current user) that have a connected wallet and can receive transfer requests."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Transfer recipients retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Unauthorized"
            )
    })
    @GetMapping("/transfer-recipients")
    public ResponseEntity<ApiResponse<List<TransferRecipientResponse>>> getTransferRecipients(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        List<TransferRecipientResponse> response = userService.getTransferRecipients(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Transfer recipients retrieved successfully"));
    }
    
    @Operation(
            summary = "Update profile (first name, last name)",
            description = "Update the authenticated user's first name and/or last name. Only provided fields will be updated."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Profile updated successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Unauthorized"
            )
    })
    @PutMapping("/me/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Profile update request for user ID: {}", userId);
        UserResponse response = userService.updateProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Profile updated successfully"));
    }
    
    @Operation(
            summary = "Update email address",
            description = "Update the authenticated user's email address. Email verification will be reset."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Email updated successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid email format"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409",
                    description = "Email already in use"
            )
    })
    @PutMapping("/me/email")
    public ResponseEntity<ApiResponse<UserResponse>> updateEmail(
            Authentication authentication,
            @Valid @RequestBody UpdateEmailRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Email update request for user ID: {}", userId);
        UserResponse response = userService.updateEmail(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Email updated successfully"));
    }
    
    @Operation(
            summary = "Change password",
            description = "Change the authenticated user's password. Requires the current password for verification."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Password changed successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid password format"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Current password is incorrect"
            )
    })
    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<UserResponse>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Password change request for user ID: {}", userId);
        UserResponse response = userService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Password changed successfully"));
    }
    
    @Operation(
            summary = "Connect wallet",
            description = "Connect an Ethereum wallet to the authenticated user's account. Requires wallet signature verification."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Wallet connected successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid wallet data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Invalid wallet signature"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409",
                    description = "Wallet already connected to another account"
            )
    })
    @PutMapping("/me/wallet")
    public ResponseEntity<ApiResponse<UserResponse>> connectWallet(
            Authentication authentication,
            @Valid @RequestBody ConnectWalletRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Wallet connect request for user ID: {}", userId);
        UserResponse response = userService.connectWallet(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Wallet connected successfully"));
    }

    @Operation(
            summary = "Disconnect wallet",
            description = "Disconnect the linked wallet from the authenticated user's account."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Wallet disconnected successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Unauthorized"
            )
    })
    @DeleteMapping("/me/wallet")
    public ResponseEntity<ApiResponse<UserResponse>> disconnectWallet(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Wallet disconnect request for user ID: {}", userId);
        UserResponse response = userService.disconnectWallet(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Wallet disconnected successfully"));
    }
}
