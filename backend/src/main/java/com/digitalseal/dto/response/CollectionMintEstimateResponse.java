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
@Schema(description = "Estimated blockchain minting fee for list-and-mint collection flow")
public class CollectionMintEstimateResponse {

    @Schema(description = "Collection ID", example = "12")
    private Long collectionId;

    @Schema(description = "Brand ID", example = "4")
    private Long brandId;

    @Schema(description = "Wallet address that will pay gas for minting", example = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    private String payerWallet;

    @Schema(description = "How many product batches require minting", example = "2")
    private Integer mintBatchCount;

    @Schema(description = "Total number of product items that still need NFT minting", example = "18")
    private Integer itemsToMint;

    @Schema(description = "Estimated total gas units", example = "1150000")
    private String estimatedGasLimit;

    @Schema(description = "Estimated gas price in wei", example = "30000000000")
    private String estimatedGasPriceWei;

    @Schema(description = "Estimated total minting fee in wei", example = "34500000000000000")
    private String estimatedFeeWei;

    @Schema(description = "Estimated total minting fee in POL", example = "0.0345")
    private String estimatedFeePol;
}
