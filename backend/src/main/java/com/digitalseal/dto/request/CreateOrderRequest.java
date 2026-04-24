package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Create order / purchase request")
public class CreateOrderRequest {
    
    @Schema(description = "Buyer wallet address for NFT transfer", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String buyerWallet;
    
    @Size(max = 1000, message = "Shipping address must not exceed 1000 characters")
    @Schema(description = "Shipping address for physical item delivery")
    private String shippingAddress;
}
