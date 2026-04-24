package com.digitalseal.dto.response;

import com.digitalseal.model.entity.SealStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Verification result for a product item's digital seal")
public class VerificationResponse {
    
    @Schema(description = "Whether the seal is authentic", example = "true")
    private Boolean authentic;
    
    @Schema(description = "Item serial number", example = "LV-SPEEDY-30-001")
    private String itemSerial;
    
    @Schema(description = "Product name", example = "Louis Vuitton Speedy 30")
    private String productName;
    
    @Schema(description = "Brand name", example = "Louis Vuitton")
    private String brandName;
    
    @Schema(description = "Whether the brand is verified")
    private Boolean brandVerified;
    
    @Schema(description = "Digital seal status", example = "REALIZED")
    private SealStatus sealStatus;
    
    @Schema(description = "NFT token ID")
    private Long tokenId;
    
    @Schema(description = "Smart contract address")
    private String contractAddress;
    
    @Schema(description = "Current owner wallet")
    private String currentOwnerWallet;
    
    @Schema(description = "Mint transaction hash — blockchain proof")
    private String mintTxHash;
    
    @Schema(description = "When the seal was minted")
    private LocalDateTime mintedAt;
    
    @Schema(description = "Ownership history chain")
    private List<OwnershipHistoryResponse> ownershipHistory;
    
    @Schema(description = "Verification timestamp")
    private LocalDateTime verifiedAt;
}
