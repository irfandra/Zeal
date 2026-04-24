package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
@Schema(description = "Connect wallet request payload")
public class ConnectWalletRequest {
    
    @NotBlank(message = "Wallet address is required")
    @Pattern(regexp = "^0x[a-fA-F0-9]{40}$", message = "Invalid Ethereum address format")
    @Schema(description = "Ethereum wallet address", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String walletAddress;
    
    @NotBlank(message = "Signature is required")
    @Schema(description = "Signed message signature from wallet", example = "0x1234567890abcdef...")
    private String signature;
    
    @NotBlank(message = "Message is required")
    @Schema(description = "The message that was signed", 
            example = "Sign this message to connect wallet to Digital Seal: a1b2c3d4e5f6g7h8i9j0")
    private String message;
}
