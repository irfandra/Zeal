package com.digitalseal.dto.response;

import com.digitalseal.model.entity.TransferRequestStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Transfer request details")
public class TransferRequestResponse {

    @Schema(description = "Transfer request ID", example = "1001")
    private Long id;

    @Schema(description = "Product item backend ID", example = "12")
    private Long itemId;

    @Schema(description = "Product item serial", example = "LV-SPEEDY-30-001")
    private String itemSerial;

    @Schema(description = "Product name", example = "Speedy 30")
    private String productName;

    @Schema(description = "Brand name", example = "Louis Vuitton")
    private String brandName;

    @Schema(description = "Product image URL", example = "https://example.com/product.png")
    private String productImageUrl;

    @Schema(description = "Brand logo URL", example = "https://example.com/brand-logo.png")
    private String brandLogoUrl;

    @Schema(description = "Current item token ID", example = "123")
    private Long tokenId;

    @Schema(description = "NFT QR value for proof verification")
    private String nftQrCode;

    @Schema(description = "Product label QR value for proof verification")
    private String productLabelQrCode;

    @Schema(description = "Certificate QR value for proof verification")
    private String certificateQrCode;

    @Schema(description = "Sender user ID", example = "1")
    private Long fromUserId;

    @Schema(description = "Sender username", example = "collector_demo")
    private String fromUserName;

    @Schema(description = "Sender wallet")
    private String fromWallet;

    @Schema(description = "Recipient user ID", example = "2")
    private Long toUserId;

    @Schema(description = "Recipient username", example = "glimpse27")
    private String toUserName;

    @Schema(description = "Recipient wallet")
    private String toWallet;

    @Schema(description = "Current request status", example = "PENDING")
    private TransferRequestStatus status;

    @Schema(description = "When request was created")
    private LocalDateTime requestedAt;

    @Schema(description = "When request was responded to")
    private LocalDateTime respondedAt;

    @Schema(description = "Blockchain transaction hash after approval")
    private String transferTxHash;
}
