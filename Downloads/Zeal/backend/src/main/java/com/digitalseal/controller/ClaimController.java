package com.digitalseal.controller;

import com.digitalseal.dto.request.ClaimItemRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.ProductItemResponse;
import com.digitalseal.service.ProductItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Claim & Ownership", description = "Claim items via QR and view owned items")
public class ClaimController {
    
    private final ProductItemService productItemService;
    
    @Operation(summary = "Claim a product item via QR scan",
            description = "Scan the QR code on the physical product to claim ownership of the Digital Seal NFT. " +
                    "RESERVED items (purchased): proves physical delivery, transfers NFT and auto-completes order. " +
                    "PRE_MINTED items (gifted/physical-first): direct standalone QR claim with no prior order.")
    @PostMapping("/claim")
    public ResponseEntity<ApiResponse<ProductItemResponse>> claimItem(
            Authentication authentication,
            @Valid @RequestBody ClaimItemRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        ProductItemResponse response = productItemService.claimItem(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Item claimed successfully. Digital seal transferred to your wallet."));
    }
    
    @Operation(summary = "Get my items", description = "Get all product items owned by the authenticated user.")
    @GetMapping("/my-items")
    public ResponseEntity<ApiResponse<List<ProductItemResponse>>> getMyItems(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        List<ProductItemResponse> items = productItemService.getMyItems(userId);
        return ResponseEntity.ok(ApiResponse.success(items, "Your items retrieved"));
    }
}
