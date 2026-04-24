package com.digitalseal.controller;

import com.digitalseal.service.QrCodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "QR", description = "In-house ZXing QR image rendering")
public class QrCodeController {

    private final QrCodeService qrCodeService;

    @Operation(
            summary = "Render QR image",
            description = "Renders a PNG QR image from payload text using in-house ZXing generation"
    )
    @GetMapping(value = "/qr/render", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> renderQr(
            @Parameter(description = "Raw QR payload text")
            @RequestParam String payload,
            @Parameter(description = "Image width and height in px (96-1024)")
            @RequestParam(required = false) Integer size,
            @Parameter(description = "Quiet-zone margin in modules (0-8)")
            @RequestParam(required = false) Integer margin
    ) {
        byte[] image = qrCodeService.renderQrPng(payload, size, margin);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE)
                .body(image);
    }
}
