package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
@Schema(description = "Create a transfer request for a product item")
public class CreateTransferRequest {

    @NotNull(message = "Item ID is required")
    @Schema(description = "Backend product item ID", example = "12")
    private Long itemId;

    @NotBlank(message = "Recipient wallet is required")
    @Pattern(regexp = "^0x[a-fA-F0-9]{40}$", message = "Recipient wallet must be a valid Ethereum address")
    @Schema(description = "Recipient wallet address (must belong to a registered user)", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String recipientWallet;
}
