package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
@Schema(description = "Request payload for emailing generated QR images as backend attachments")
public class SendQrBatchEmailRequest {

    @Schema(
            description = "Optional collection ID to scope QR attachments. Leave empty to include all collections under this brand",
            example = "12"
    )
    private Long collectionId;

    @Email(message = "Recipient email must be a valid email address")
    @Schema(
            description = "Target recipient email. When omitted, backend uses configured platform recipient",
            example = "zealsysinfo@gmail.com"
    )
    private String recipientEmail;
}
