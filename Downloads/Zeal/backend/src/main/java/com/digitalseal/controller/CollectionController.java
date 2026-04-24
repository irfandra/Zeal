package com.digitalseal.controller;

import com.digitalseal.dto.request.CreateCollectionRequest;
import com.digitalseal.dto.request.ListCollectionRequest;
import com.digitalseal.dto.request.SendQrBatchEmailRequest;
import com.digitalseal.dto.request.UpdateCollectionRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.CollectionMintEstimateResponse;
import com.digitalseal.dto.response.CollectionResponse;
import com.digitalseal.dto.response.QrBatchEmailResponse;
import com.digitalseal.service.CollectionService;
import com.digitalseal.service.QrBatchEmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/brands/{brandId}/collections")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "Collection", description = "Collection management endpoints")
public class CollectionController {
    
    private final CollectionService collectionService;
        private final QrBatchEmailService qrBatchEmailService;
    
    @Operation(
            summary = "Create a new collection",
            description = "Creates a new collection under a brand. Only the brand owner can create collections."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "Collection created successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    public ResponseEntity<ApiResponse<CollectionResponse>> createCollection(
            Authentication authentication,
            @PathVariable Long brandId,
            @Valid @RequestBody CreateCollectionRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Collection creation request for brand ID: {} from user ID: {}", brandId, userId);
        CollectionResponse response = collectionService.createCollection(userId, brandId, request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Collection created successfully"));
    }
    
    @Operation(
            summary = "Get all collections for a brand",
            description = "Returns all collections for a brand. Publicly accessible."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Collections retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Brand not found"
            )
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<CollectionResponse>>> getCollections(@PathVariable Long brandId) {
        List<CollectionResponse> collections = collectionService.getCollectionsByBrand(brandId);
        return ResponseEntity.ok(ApiResponse.success(collections, "Collections retrieved successfully"));
    }
    
    @Operation(
            summary = "Get collection by ID",
            description = "Returns a specific collection with product count. Publicly accessible."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Collection retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Collection not found"
            )
    })
    @GetMapping("/{collectionId}")
    public ResponseEntity<ApiResponse<CollectionResponse>> getCollection(
            @PathVariable Long brandId,
            @PathVariable Long collectionId) {
        CollectionResponse response = collectionService.getCollectionById(collectionId);
        return ResponseEntity.ok(ApiResponse.success(response, "Collection retrieved successfully"));
    }
    
    @Operation(
            summary = "Update collection",
            description = "Updates collection details. Only the brand owner can update."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Collection updated successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Collection not found"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{collectionId}")
    public ResponseEntity<ApiResponse<CollectionResponse>> updateCollection(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable Long collectionId,
            @Valid @RequestBody UpdateCollectionRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Collection update request for collection ID: {} under brand ID: {} from user ID: {}", collectionId, brandId, userId);
        CollectionResponse response = collectionService.updateCollection(userId, brandId, collectionId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Collection updated successfully"));
    }

    @Operation(
            summary = "Mint and list collection",
            description = "Lists all eligible products in a collection and sets the collection sales end date/time. "
                    + "Any missing product-item NFTs are minted before listing."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Collection listed successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid listing request"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{collectionId}/list")
    public ResponseEntity<ApiResponse<CollectionResponse>> listCollection(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable Long collectionId,
            @Valid @RequestBody ListCollectionRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        CollectionResponse response = collectionService.listCollectionForMarketplace(
                userId,
                brandId,
                collectionId,
                request.getSalesEndAt());
        return ResponseEntity.ok(ApiResponse.success(response, "Collection listed on marketplace"));
    }

    @Operation(
            summary = "Estimate mint fee for list-and-mint flow",
            description = "Calculates estimated blockchain minting fee and payer wallet for product items that still need NFT minting before listing."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Mint fee estimate retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{collectionId}/list/estimate")
    public ResponseEntity<ApiResponse<CollectionMintEstimateResponse>> estimateListCollectionMintFee(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable Long collectionId) {
        Long userId = Long.parseLong(authentication.getName());
        CollectionMintEstimateResponse response = collectionService.estimateCollectionMintFee(userId, brandId, collectionId);
        return ResponseEntity.ok(ApiResponse.success(response, "Mint fee estimate retrieved"));
    }

    @Operation(
            summary = "Demo: End collection sale now",
            description = "For demo/testing: immediately end sale for one listed collection and burn unsold pre-minted items."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Collection sale ended and unsold items processed",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Collection is not in a valid state for forced end"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{collectionId}/demo/end-sale")
    public ResponseEntity<ApiResponse<CollectionResponse>> endCollectionSaleNow(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable Long collectionId) {
        Long userId = Long.parseLong(authentication.getName());
        CollectionResponse response = collectionService.endCollectionSaleNow(userId, brandId, collectionId);
        return ResponseEntity.ok(ApiResponse.success(response, "Collection sale ended for demo"));
    }

    @Operation(
            summary = "Email generated QR images as attachments",
            description = "Sends generated QR images for a brand or collection through backend mail with PNG attachments."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "QR attachments emailed successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Collection not found"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/qr/email")
    public ResponseEntity<ApiResponse<QrBatchEmailResponse>> emailGeneratedQrBatch(
            Authentication authentication,
            @PathVariable Long brandId,
            @Valid @RequestBody SendQrBatchEmailRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        QrBatchEmailResponse response = qrBatchEmailService.sendBrandQrBatchEmail(userId, brandId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "QR attachments emailed successfully"));
    }
    
    @Operation(
            summary = "Delete collection",
            description = "Deletes a collection. Products in this collection become standalone. Only the brand owner can delete."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Collection deleted successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Collection not found"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{collectionId}")
    public ResponseEntity<ApiResponse<Void>> deleteCollection(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable Long collectionId) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Collection delete request for collection ID: {} under brand ID: {} from user ID: {}", collectionId, brandId, userId);
        collectionService.deleteCollection(userId, brandId, collectionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Collection deleted successfully"));
    }
}
