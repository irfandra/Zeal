package com.digitalseal.service;

import com.digitalseal.dto.request.SendQrBatchEmailRequest;
import com.digitalseal.dto.response.QrBatchEmailResponse;
import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.exception.ResourceNotFoundException;
import com.digitalseal.model.entity.Collection;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.repository.CollectionRepository;
import com.digitalseal.repository.ProductItemRepository;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrBatchEmailService {

    private static final int ATTACHMENT_QR_SIZE = 320;
    private static final int ATTACHMENT_QR_MARGIN = 1;
    private static final String QR_IMAGE_CONTENT_TYPE = "image/png";
    private static final int MAX_SERIALS_IN_EMAIL_BODY = 150;

    private final ProductService productService;
    private final CollectionRepository collectionRepository;
    private final ProductItemRepository productItemRepository;
    private final QrCodeService qrCodeService;
    private final EmailService emailService;

    @Value("${app.mail.platform-recipient:${app.mail.from}}")
    private String defaultPlatformRecipient;

    @Value("${app.mail.qr-batch.max-attachments:120}")
    private int maxAttachments;

    @Transactional
    public QrBatchEmailResponse sendBrandQrBatchEmail(
            Long userId,
            Long brandId,
            SendQrBatchEmailRequest request
    ) {
        productService.verifyBrandOwnership(userId, brandId);

        SendQrBatchEmailRequest safeRequest = request == null ? new SendQrBatchEmailRequest() : request;
        Collection scopeCollection = resolveCollectionScope(brandId, safeRequest.getCollectionId());
        Long scopeCollectionId = scopeCollection == null ? null : scopeCollection.getId();
        String scopeLabel = scopeCollection == null ? "All Collections" : scopeCollection.getCollectionName();

        String recipientEmail = resolveRecipientEmail(safeRequest.getRecipientEmail());

        List<ProductItem> productItems = productItemRepository.findBrandItemsForQrEmail(brandId, scopeCollectionId);
        if (productItems.isEmpty()) {
            if (scopeCollectionId == null) {
                throw new InvalidStateException("No product items found for this brand");
            }
            throw new InvalidStateException("No product items found for this collection");
        }

        List<EmailService.EmailAttachment> attachments = new ArrayList<>();
        Set<String> includedItemSerials = new LinkedHashSet<>();
        boolean capReached = false;

        if (maxAttachments <= 0) {
            throw new InvalidStateException("Invalid configuration: app.mail.qr-batch.max-attachments must be greater than 0");
        }

        for (ProductItem item : productItems) {
            if (attachments.size() >= maxAttachments) {
                capReached = true;
                break;
            }

            String itemSerial = normalizeItemSerial(item);
            int beforeCount = attachments.size();

            addQrAttachment(attachments, itemSerial, "nft", item.getNftQrCode(), maxAttachments);
            addQrAttachment(attachments, itemSerial, "label", item.getProductLabelQrCode(), maxAttachments);
            addQrAttachment(attachments, itemSerial, "certificate", item.getCertificateQrCode(), maxAttachments);

            if (attachments.size() > beforeCount) {
                includedItemSerials.add(itemSerial);
            }

            if (attachments.size() >= maxAttachments) {
                capReached = true;
                break;
            }
        }

        if (capReached) {
            throw new InvalidStateException(
                    "QR export exceeds attachment cap of " + maxAttachments
                            + ". Narrow the scope or increase app.mail.qr-batch.max-attachments"
            );
        }

        if (attachments.isEmpty()) {
            throw new InvalidStateException("No QR payloads available for email attachment");
        }

        String subject = String.format("Digital Seal QR Export - Brand %d (%s)", brandId, scopeLabel);
        String body = buildEmailBody(brandId, scopeLabel, includedItemSerials, attachments.size());

        emailService.sendEmailWithAttachments(recipientEmail, subject, body, false, attachments);

        log.info(
                "Sent {} QR attachment(s) for brand {} and collection scope {} to {}",
                attachments.size(),
                brandId,
                scopeCollectionId,
                recipientEmail
        );

        return QrBatchEmailResponse.builder()
                .brandId(brandId)
                .collectionId(scopeCollectionId)
                .recipientEmail(recipientEmail)
                .itemsIncluded(includedItemSerials.size())
                .attachmentsCount(attachments.size())
                .subject(subject)
                .build();
    }

    private Collection resolveCollectionScope(Long brandId, Long collectionId) {
        if (collectionId == null) {
            return null;
        }

        return collectionRepository.findByIdAndBrandId(collectionId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found or doesn't belong to this brand"));
    }

    private String resolveRecipientEmail(String recipientEmail) {
        String explicitRecipient = String.valueOf(recipientEmail == null ? "" : recipientEmail).trim();
        if (!explicitRecipient.isBlank()) {
            return explicitRecipient;
        }

        String fallbackRecipient = String.valueOf(defaultPlatformRecipient == null ? "" : defaultPlatformRecipient).trim();
        if (fallbackRecipient.isBlank()) {
            throw new InvalidStateException("Platform recipient email is not configured");
        }

        return fallbackRecipient;
    }

    private void addQrAttachment(
            List<EmailService.EmailAttachment> attachments,
            String itemSerial,
            String qrType,
            String payload,
            int attachmentLimit
    ) {
        if (attachments.size() >= attachmentLimit) {
            return;
        }

        String safePayload = String.valueOf(payload == null ? "" : payload).trim();
        if (safePayload.isBlank()) {
            return;
        }

        byte[] imageBytes = qrCodeService.renderQrPng(safePayload, ATTACHMENT_QR_SIZE, ATTACHMENT_QR_MARGIN);
        String fileName = sanitizeFileName(itemSerial + "-" + qrType + ".png");
        attachments.add(new EmailService.EmailAttachment(fileName, imageBytes, QR_IMAGE_CONTENT_TYPE));
    }

    private String normalizeItemSerial(ProductItem item) {
        String serial = String.valueOf(item.getItemSerial() == null ? "" : item.getItemSerial()).trim();
        if (!serial.isBlank()) {
            return serial;
        }

        if (item.getId() != null) {
            return "item-" + item.getId();
        }

        return "item";
    }

    private String sanitizeFileName(String value) {
        String safeValue = String.valueOf(value == null ? "" : value)
                .trim()
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_+", "_");

        if (safeValue.isBlank()) {
            return "qr.png";
        }

        if (safeValue.length() > 120) {
            return safeValue.substring(0, 120);
        }

        return safeValue;
    }

    private String buildEmailBody(Long brandId, String scopeLabel, Set<String> itemSerials, int attachmentCount) {
        StringBuilder body = new StringBuilder();
        body.append("Digital Seal QR export attached.\n\n");
        body.append("Brand ID: ").append(brandId).append("\n");
        body.append("Scope: ").append(scopeLabel).append("\n");
        body.append("Items included: ").append(itemSerials.size()).append("\n");
        body.append("QR attachments: ").append(attachmentCount).append("\n\n");
        body.append("Included item serials:\n");

        int listedCount = 0;
        for (String serial : itemSerials) {
            if (listedCount >= MAX_SERIALS_IN_EMAIL_BODY) {
                body.append("...and ").append(itemSerials.size() - listedCount).append(" more item(s).\n");
                break;
            }
            body.append("- ").append(serial).append("\n");
            listedCount += 1;
        }

        return body.toString();
    }
}
