package com.digitalseal.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageConfig;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class QrCodeService {

    private static final int DEFAULT_SIZE = 300;
    private static final int MIN_SIZE = 96;
    private static final int MAX_SIZE = 1024;
    private static final int DEFAULT_MARGIN = 1;
    private static final int MIN_MARGIN = 0;
    private static final int MAX_MARGIN = 8;
    private static final int DARK_COLOR_ARGB = 0xFF111111;
    private static final int LIGHT_COLOR_ARGB = 0xFFFFFFFF;

    public byte[] renderQrPng(String payload, Integer size, Integer margin) {
        String safePayload = String.valueOf(payload == null ? "" : payload).trim();
        if (safePayload.isBlank()) {
            throw new IllegalArgumentException("QR payload is required");
        }

        int safeSize = clamp(
                size == null ? DEFAULT_SIZE : size,
                MIN_SIZE,
                MAX_SIZE
        );

        int safeMargin = clamp(
                margin == null ? DEFAULT_MARGIN : margin,
                MIN_MARGIN,
                MAX_MARGIN
        );

        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, safeMargin);

            BitMatrix bitMatrix = writer.encode(
                    safePayload,
                    BarcodeFormat.QR_CODE,
                    safeSize,
                    safeSize,
                    hints
            );

            MatrixToImageConfig config = new MatrixToImageConfig(DARK_COLOR_ARGB, LIGHT_COLOR_ARGB);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix, config);

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", output);
            return output.toByteArray();
        } catch (WriterException | IOException exception) {
            log.error("Failed to render QR PNG", exception);
            throw new IllegalStateException("Unable to render QR image");
        }
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
