package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Claim a product item using a claim code (from QR scan)")
public class ClaimItemRequest {
    
    @NotBlank(message = "Claim code is required")
    @Schema(description = "The claim code scanned from the QR label", example = "abc123def456")
    private String claimCode;
    
    @Schema(description = "Wallet address to receive the NFT seal", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String walletAddress;
}
