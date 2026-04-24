package com.digitalseal.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Estimated checkout fee breakdown for one product item order")
public class OrderFeeEstimateResponse {

    @Schema(description = "Product ID", example = "A1B2C3")
    private String productId;

    @Schema(description = "Unit price in POL", example = "2040")
    private BigDecimal unitPrice;

    @Schema(description = "Platform fee rate as decimal", example = "0.05")
    private BigDecimal platformFeeRate;

    @Schema(description = "Platform fee in POL", example = "102")
    private BigDecimal platformFee;

    @Schema(description = "Delivery fee in POL", example = "500")
    private BigDecimal deliveryFee;

    @Schema(description = "Estimated network transaction fee in POL", example = "0.00063")
    private BigDecimal transactionFee;

    @Schema(description = "Estimated gas limit for simple payment transfer", example = "21000")
    private String estimatedGasLimit;

    @Schema(description = "Estimated gas price in wei", example = "30000000000")
    private String estimatedGasPriceWei;

    @Schema(description = "Total checkout amount in POL", example = "2642.00063")
    private BigDecimal totalPrice;
}
