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
@Schema(description = "Result of backend QR attachment email dispatch")
public class QrBatchEmailResponse {

    @Schema(description = "Brand ID used for QR export", example = "4")
    private Long brandId;

    @Schema(description = "Collection scope for this export. Null means all collections", example = "12")
    private Long collectionId;

    @Schema(description = "Resolved recipient email", example = "zealsysinfo@gmail.com")
    private String recipientEmail;

    @Schema(description = "How many product items had at least one QR attachment", example = "25")
    private Integer itemsIncluded;

    @Schema(description = "Total QR image attachments sent", example = "75")
    private Integer attachmentsCount;

    @Schema(description = "Email subject used for the dispatch", example = "Digital Seal QR Export - Brand 4 (Summer 2026)")
    private String subject;
}
