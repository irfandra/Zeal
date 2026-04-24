package com.digitalseal.service;

import com.digitalseal.dto.request.CreateCollectionRequest;
import com.digitalseal.dto.request.UpdateCollectionRequest;
import com.digitalseal.dto.response.CollectionResponse;
import com.digitalseal.dto.response.CollectionMintEstimateResponse;
import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.exception.ResourceNotFoundException;
import com.digitalseal.exception.UnauthorizedException;
import com.digitalseal.exception.UserAlreadyExistsException;
import com.digitalseal.model.entity.Brand;
import com.digitalseal.model.entity.Collection;
import com.digitalseal.model.entity.CollectionStatus;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.OwnershipHistory;
import com.digitalseal.model.entity.Product;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.ProductStatus;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.model.entity.TransferType;
import com.digitalseal.repository.BrandRepository;
import com.digitalseal.repository.CollectionRepository;
import com.digitalseal.repository.OwnershipHistoryRepository;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.ProductRepository;
import com.digitalseal.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class CollectionService {

    private static final int CLAIM_CODE_LENGTH = 16;
    private static final String INLINE_METADATA_PREFIX = "data:application/json;base64,";
    private static final int METADATA_NAME_MAX_LENGTH = 80;
    private static final int METADATA_DESCRIPTION_MAX_LENGTH = 180;
    private static final int METADATA_ATTRIBUTE_MAX_LENGTH = 64;
    private static final BigDecimal WEI_PER_POL = new BigDecimal("1000000000000000000");
    private static final BigInteger DEFAULT_APRIL_FIRST_POLYGON_GAS_PRICE_WEI = BigInteger.valueOf(30_000_000_000L);
    private static final BigInteger STATIC_ESTIMATE_BATCH_GAS_BASE_UNITS = BigInteger.valueOf(350_000L);
    private static final BigInteger STATIC_ESTIMATE_GAS_PER_ITEM_UNITS = BigInteger.valueOf(180_000L);
    private static final BigInteger STATIC_ESTIMATE_GAS_BUFFER_NUMERATOR = BigInteger.valueOf(12); // +20%
    private static final BigInteger STATIC_ESTIMATE_GAS_BUFFER_DENOMINATOR = BigInteger.TEN;
    private static final BigInteger STATIC_ESTIMATE_MIN_BATCH_GAS_UNITS = BigInteger.valueOf(500_000L);
    private static final BigInteger STATIC_ESTIMATE_MAX_BATCH_GAS_UNITS = BigInteger.valueOf(25_000_000L);
    // Keep each on-chain pre-mint call below common local node tx gas caps.
    private static final int MAX_MINT_ITEMS_PER_BATCH_TX = 6;
    
    private final CollectionRepository collectionRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final ProductItemRepository productItemRepository;
    private final OwnershipHistoryRepository ownershipHistoryRepository;
    private final UserRepository userRepository;
    private final BlockchainService blockchainService;
    private final ObjectMapper objectMapper;
    private final PlatformLogService platformLogService;
    private final MarketplaceLifecycleService marketplaceLifecycleService;

    @Value("${web3.estimate.april-first-polygon-gas-price-wei:30000000000}")
    private String aprilFirstPolygonGasPriceWeiRaw;

    private record MintBatchPreparation(
        String brandWallet,
        BigInteger priceWei,
        List<ProductItem> missingTokenItems,
        List<String> serials,
        List<String> metadataUris
    ) {}
    
    /**
     * Create a new collection under a brand
     */
    @Transactional
    public CollectionResponse createCollection(Long userId, Long brandId, CreateCollectionRequest request) {
        Brand brand = verifyBrandOwnership(userId, brandId);
        
        // Check collection name uniqueness within the brand
        if (collectionRepository.existsByCollectionNameIgnoreCaseAndBrandId(request.getCollectionName(), brandId)) {
            throw new UserAlreadyExistsException("Collection name already exists for this brand");
        }
        
        Collection collection = Collection.builder()
                .brand(brand)
                .collectionName(request.getCollectionName())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .season(request.getSeason())
                .isLimitedEdition(request.getIsLimitedEdition() != null ? request.getIsLimitedEdition() : false)
                .releaseDate(request.getReleaseDate())
            .status(request.getStatus() != null ? request.getStatus() : CollectionStatus.DRAFT)
            .tag(request.getTag())
            .salesEndAt(request.getSalesEndAt())
            .tagColor(request.getTagColor())
            .tagTextColor(request.getTagTextColor())
                .build();
        
        Collection saved = collectionRepository.save(collection);
        log.info("Collection '{}' created under brand ID: {} by user ID: {}", saved.getCollectionName(), brandId, userId);
        
        return mapToResponse(saved, 0L);
    }
    
    /**
     * Get all collections for a brand (public)
     */
    public List<CollectionResponse> getCollectionsByBrand(Long brandId) {
        // Verify brand exists
        brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));
        
        return collectionRepository.findByBrandId(brandId).stream()
                .map(c -> mapToResponse(c, productRepository.countByCollectionId(c.getId())))
                .collect(Collectors.toList());
    }
    
    /**
     * Get a specific collection by ID (public)
     */
    public CollectionResponse getCollectionById(Long collectionId) {
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new RuntimeException("Collection not found"));
        
        long productCount = productRepository.countByCollectionId(collectionId);
        return mapToResponse(collection, productCount);
    }
    
    /**
     * Update a collection (only the brand owner can update)
     */
    @Transactional
    public CollectionResponse updateCollection(Long userId, Long brandId, Long collectionId, UpdateCollectionRequest request) {
        verifyBrandOwnership(userId, brandId);
        
        Collection collection = collectionRepository.findByIdAndBrandId(collectionId, brandId)
                .orElseThrow(() -> new RuntimeException("Collection not found or doesn't belong to this brand"));
        
        if (request.getCollectionName() != null) {
            if (!collection.getCollectionName().equalsIgnoreCase(request.getCollectionName()) &&
                collectionRepository.existsByCollectionNameIgnoreCaseAndBrandId(request.getCollectionName(), brandId)) {
                throw new UserAlreadyExistsException("Collection name already exists for this brand");
            }
            collection.setCollectionName(request.getCollectionName());
        }
        
        if (request.getDescription() != null) {
            collection.setDescription(request.getDescription());
        }
        if (request.getImageUrl() != null) {
            collection.setImageUrl(request.getImageUrl());
        }
        if (request.getSeason() != null) {
            collection.setSeason(request.getSeason());
        }
        if (request.getIsLimitedEdition() != null) {
            collection.setIsLimitedEdition(request.getIsLimitedEdition());
        }
        if (request.getReleaseDate() != null) {
            collection.setReleaseDate(request.getReleaseDate());
        }
        if (request.getStatus() != null) {
            collection.setStatus(request.getStatus());
        }
        if (request.getTag() != null) {
            collection.setTag(request.getTag());
        }
        if (request.getSalesEndAt() != null) {
            collection.setSalesEndAt(request.getSalesEndAt());
        }
        if (request.getTagColor() != null) {
            collection.setTagColor(request.getTagColor());
        }
        if (request.getTagTextColor() != null) {
            collection.setTagTextColor(request.getTagTextColor());
        }
        
        Collection updated = collectionRepository.save(collection);
        log.info("Collection '{}' updated by user ID: {}", updated.getCollectionName(), userId);
        
        long productCount = productRepository.countByCollectionId(collectionId);
        return mapToResponse(updated, productCount);
    }

    /**
     * List a collection on marketplace with a mandatory sales end date/time.
     *
     * Behavior:
     * 1. Validates sales window.
     * 2. Ensures each product item has an on-chain NFT (mint missing token IDs when possible).
     * 3. Transitions eligible products to LISTED and aligns their listing deadline.
     * 4. Marks the collection status as LISTED with salesEndAt.
     */
    @Transactional
    public CollectionResponse listCollectionForMarketplace(Long userId, Long brandId, Long collectionId, LocalDateTime salesEndAt) {
        verifyBrandOwnership(userId, brandId);
        ensureSalesWindowIsValid(salesEndAt);

        Collection collection = collectionRepository.findByIdAndBrandId(collectionId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found or doesn't belong to this brand"));

        List<Product> products = productRepository.findByCollectionId(collectionId).stream()
                .filter(product -> product.getBrand() != null && product.getBrand().getId().equals(brandId))
                .collect(Collectors.toList());

        if (products.isEmpty()) {
            throw new InvalidStateException("Collection has no products to list");
        }

        int listedProducts = 0;
        LocalDateTime listedAt = LocalDateTime.now();

        for (Product product : products) {
            ProductStatus status = product.getStatus();

            if (status == ProductStatus.DRAFT) {
                throw new InvalidStateException(
                        "Product '" + product.getProductName() + "' is still DRAFT. Publish and pre-mint it before listing the collection.");
            }

            long itemCount = productItemRepository.countByProductId(product.getId());
            if (itemCount <= 0) {
                throw new InvalidStateException(
                        "Product '" + product.getProductName() + "' has no product items. Pre-mint product items before listing.");
            }

            ensureMintedOnChainForAllItems(product);

            long availableItems = productItemRepository.countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);

            if (availableItems > 0) {
                product.setStatus(ProductStatus.LISTED);
                product.setListedAt(listedAt);
                product.setListingDeadline(salesEndAt);
                listedProducts += 1;
            } else {
                if (product.getStatus() == ProductStatus.PUBLISHED || product.getStatus() == ProductStatus.PREMINTED || product.getStatus() == ProductStatus.LISTED) {
                    product.setStatus(ProductStatus.SOLD_OUT);
                }
                product.setListingDeadline(salesEndAt);
            }

            productRepository.save(product);
        }

        if (listedProducts == 0) {
            throw new InvalidStateException("No available pre-minted items found to list for this collection");
        }

        collection.setStatus(CollectionStatus.LISTED);
        collection.setSalesEndAt(salesEndAt);

        Collection saved = collectionRepository.save(collection);
        log.info("Collection '{}' listed with sales end at {} by user ID: {}", saved.getCollectionName(), salesEndAt, userId);

        platformLogService.info(
                LogCategory.PRODUCT,
                "COLLECTION_LISTED",
                userId,
                saved.getBrand().getUser().getEmail(),
                "COLLECTION",
                saved.getId().toString(),
                "Collection: " + saved.getCollectionName() + " | Sales end: " + salesEndAt + " | Listed products: " + listedProducts
        );

        long productCount = productRepository.countByCollectionId(collectionId);
        return mapToResponse(saved, productCount);
    }

    @Transactional(readOnly = true)
    public CollectionMintEstimateResponse estimateCollectionMintFee(Long userId, Long brandId, Long collectionId) {
        verifyBrandOwnership(userId, brandId);

        Collection collection = collectionRepository.findByIdAndBrandId(collectionId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found or doesn't belong to this brand"));

        List<Product> products = productRepository.findByCollectionId(collectionId).stream()
                .filter(product -> product.getBrand() != null && product.getBrand().getId().equals(brandId))
                .collect(Collectors.toList());

        if (products.isEmpty()) {
            throw new InvalidStateException("Collection has no products to list");
        }

        String payerWallet = safeTrim(collection.getBrand() != null ? collection.getBrand().getCompanyWalletAddress() : "");
        if (payerWallet.isBlank()) {
            throw new InvalidStateException("Brand wallet is required to estimate minting fees");
        }

        int mintBatchCount = 0;
        int itemsToMint = 0;
        BigInteger estimatedGasLimit = BigInteger.ZERO;
        BigInteger estimatedGasPriceWei = BigInteger.ZERO;
        BigInteger estimatedFeeWei = BigInteger.ZERO;
        BigInteger staticGasPriceWei = resolveStaticEstimateGasPriceWei();

        for (Product product : products) {
            ProductStatus status = product.getStatus();

            if (status == ProductStatus.DRAFT) {
                throw new InvalidStateException(
                        "Product '" + product.getProductName() + "' is still DRAFT. Publish and pre-mint it before listing the collection.");
            }

            long itemCount = productItemRepository.countByProductId(product.getId());
            if (itemCount <= 0) {
                throw new InvalidStateException(
                        "Product '" + product.getProductName() + "' has no product items. Pre-mint product items before listing.");
            }

            List<ProductItem> allItems = productItemRepository.findByProductId(product.getId());
            MintBatchPreparation mintBatch = prepareMintBatch(product, allItems);
            if (mintBatch == null) {
                continue;
            }

            int missingItems = mintBatch.missingTokenItems().size();
            int chunkCount = countMintBatchChunks(missingItems);

            mintBatchCount += chunkCount;
            itemsToMint += missingItems;
            estimatedGasPriceWei = maxPositive(estimatedGasPriceWei, staticGasPriceWei);

            for (int chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
                int startIndex = chunkIndex * MAX_MINT_ITEMS_PER_BATCH_TX;
                int endIndex = Math.min(startIndex + MAX_MINT_ITEMS_PER_BATCH_TX, missingItems);
                int chunkSize = Math.max(endIndex - startIndex, 0);

                BigInteger batchGasLimit = estimateStaticBatchGasLimit(chunkSize);
                BigInteger batchFeeWei = batchGasLimit.multiply(staticGasPriceWei);

                estimatedGasLimit = estimatedGasLimit.add(nonNegativeOrZero(batchGasLimit));
                estimatedFeeWei = estimatedFeeWei.add(nonNegativeOrZero(batchFeeWei));
            }
        }

        return CollectionMintEstimateResponse.builder()
                .collectionId(collection.getId())
                .brandId(collection.getBrand().getId())
                .payerWallet(payerWallet)
                .mintBatchCount(mintBatchCount)
                .itemsToMint(itemsToMint)
                .estimatedGasLimit(estimatedGasLimit.toString())
                .estimatedGasPriceWei(estimatedGasPriceWei.toString())
                .estimatedFeeWei(estimatedFeeWei.toString())
                .estimatedFeePol(formatWeiToPol(estimatedFeeWei))
                .build();
    }

    /**
     * Demo/testing helper: immediately end one listed collection sale and burn unsold items.
     */
    @Transactional
    public CollectionResponse endCollectionSaleNow(Long userId, Long brandId, Long collectionId) {
        verifyBrandOwnership(userId, brandId);

        Collection collection = collectionRepository.findByIdAndBrandId(collectionId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found or doesn't belong to this brand"));

        Collection updatedCollection = marketplaceLifecycleService.forceExpireCollectionNow(collection);
        long productCount = productRepository.countByCollectionId(collectionId);

        return mapToResponse(updatedCollection, productCount);
    }

    private void ensureSalesWindowIsValid(LocalDateTime salesEndAt) {
        if (salesEndAt == null) {
            throw new InvalidStateException("Sales end date/time is required");
        }

        if (!salesEndAt.isAfter(LocalDateTime.now())) {
            throw new InvalidStateException("Sales end date/time must be in the future");
        }
    }

    private void ensureMintedOnChainForAllItems(Product product) {
        List<ProductItem> allItems = productItemRepository.findByProductId(product.getId());
        MintBatchPreparation mintBatch = prepareMintBatch(product, allItems);
        if (mintBatch != null) {
            if (!blockchainService.isAvailable()) {
                throw new InvalidStateException(
                        "Blockchain is unavailable. Cannot mint NFTs for all product items before listing.");
            }

            String initialOwnerWallet = resolveBrandOwnerWalletOrThrow(product);
            List<ProductItem> missingTokenItems = mintBatch.missingTokenItems();
            List<String> serials = mintBatch.serials();
            List<String> metadataUris = mintBatch.metadataUris();
            LocalDateTime firstMintedAt = null;
            int mintedTxBatches = 0;

            for (int start = 0; start < missingTokenItems.size(); start += MAX_MINT_ITEMS_PER_BATCH_TX) {
                int end = Math.min(start + MAX_MINT_ITEMS_PER_BATCH_TX, missingTokenItems.size());

                List<ProductItem> chunkItems = missingTokenItems.subList(start, end);
                List<String> chunkSerials = serials.subList(start, end);
                List<String> chunkMetadataUris = metadataUris.subList(start, end);

                BlockchainService.BatchMintResult mintResult = blockchainService.batchPreMint(
                        mintBatch.brandWallet(),
                        chunkSerials,
                        chunkMetadataUris,
                        mintBatch.priceWei());

                if (mintResult == null || mintResult.startTokenId() == null) {
                    throw new InvalidStateException("Failed to mint product items on-chain before listing");
                }

                LocalDateTime mintedAt = LocalDateTime.now();
                if (firstMintedAt == null) {
                    firstMintedAt = mintedAt;
                }

                BigInteger startTokenId = mintResult.startTokenId();
                for (int index = 0; index < chunkItems.size(); index += 1) {
                    ProductItem item = chunkItems.get(index);
                    BigInteger tokenId = startTokenId.add(BigInteger.valueOf(index));

                    item.setTokenId(tokenId.longValue());
                    item.setMintTxHash(mintResult.txHash());
                    item.setMetadataUri(chunkMetadataUris.get(index));
                    item.setMintedAt(mintedAt);
                    if (!initialOwnerWallet.isBlank()) {
                        item.setCurrentOwnerWallet(initialOwnerWallet);
                    }

                    ownershipHistoryRepository.save(OwnershipHistory.builder()
                            .productItem(item)
                            .fromWallet(mintBatch.brandWallet())
                            .toWallet(mintBatch.brandWallet())
                            .transferType(TransferType.MINT)
                            .txHash(mintResult.txHash())
                            .notes("Collection list flow on-chain mint")
                            .transferredAt(mintedAt)
                            .build());
                }

                mintedTxBatches += 1;
            }

            productItemRepository.saveAll(missingTokenItems);

            if (product.getContractAddress() == null || product.getContractAddress().isBlank()) {
                String contractAddress = System.getenv("CONTRACT_ADDRESS");
                if (contractAddress != null && !contractAddress.isBlank()) {
                    product.setContractAddress(contractAddress);
                }
            }
            if (product.getPremintedAt() == null && firstMintedAt != null) {
                product.setPremintedAt(firstMintedAt);
            }
            if (product.getStatus() == ProductStatus.PUBLISHED) {
                product.setStatus(ProductStatus.PREMINTED);
            }

            productRepository.save(product);

            log.info(
                    "Minted {} missing NFTs for product '{}' in {} batch(es) before listing",
                    missingTokenItems.size(),
                    product.getProductName(),
                    mintedTxBatches
            );
        }

        int backfilledPayloadCount = ensureQrPayloadsForMintedItems(product, allItems);
        if (backfilledPayloadCount > 0) {
            productItemRepository.saveAll(allItems);
            log.info("Backfilled claim/QR payloads for {} minted product items in '{}' before listing",
                    backfilledPayloadCount,
                    product.getProductName());
        }
    }

    private MintBatchPreparation prepareMintBatch(Product product, List<ProductItem> allItems) {
        List<ProductItem> missingTokenItems = allItems.stream()
                .filter(item -> item.getSealStatus() != SealStatus.BURNED)
                .filter(item -> item.getTokenId() == null)
                .sorted(Comparator.comparing(ProductItem::getItemIndex))
                .collect(Collectors.toList());

        if (missingTokenItems.isEmpty()) {
            return null;
        }

        String brandWallet = resolveBrandOwnerWalletOrThrow(product);

        BigDecimal price = product.getPrice();
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidStateException("Product price must be set before minting NFTs for listing");
        }

        List<String> serials = missingTokenItems.stream().map(ProductItem::getItemSerial).collect(Collectors.toList());
        List<String> metadataUris = missingTokenItems.stream()
                .map(item -> {
                    String existingUri = item.getMetadataUri();
                    if (existingUri != null && !existingUri.isBlank()) {
                        return existingUri;
                    }
                    return buildInlineMetadataDataUri(product, item.getItemSerial());
                })
                .collect(Collectors.toList());

        BigInteger priceWei = price.multiply(WEI_PER_POL).toBigInteger();
        return new MintBatchPreparation(brandWallet, priceWei, missingTokenItems, serials, metadataUris);
    }

    /**
     * Backfill claim and QR payload fields for legacy product items.
     * Listing must guarantee minted inventory has claimable payloads.
     */
    private int ensureQrPayloadsForMintedItems(Product product, List<ProductItem> items) {
        int updated = 0;
        String initialOwnerWallet = resolveBrandOwnerWalletOrThrow(product);

        for (ProductItem item : items) {
            if (item.getSealStatus() == SealStatus.BURNED) {
                continue;
            }

            if (item.getTokenId() == null) {
                continue;
            }

            String itemSerial = safeTrim(item.getItemSerial());
            if (itemSerial.isBlank()) {
                continue;
            }

            boolean dirty = false;
            String claimCode = safeTrim(item.getClaimCode());
            String existingLabelPayload = safeTrim(item.getProductLabelQrCode());

            if (claimCode.isBlank()) {
                // Reuse existing non-URI label payload when possible, otherwise generate a fresh unique code.
                String preferredClaimCode = existingLabelPayload.startsWith("digitalseal://label/")
                        ? ""
                        : existingLabelPayload;
                claimCode = resolveUniqueClaimCode(preferredClaimCode, item.getId());
                item.setClaimCode(claimCode);
                dirty = true;
            }

            if (safeTrim(item.getNftQrCode()).isBlank()) {
                item.setNftQrCode(buildNftQrCode(itemSerial));
                dirty = true;
            }

            String currentLabelPayload = safeTrim(item.getProductLabelQrCode());
            if (currentLabelPayload.isBlank() || currentLabelPayload.startsWith("digitalseal://label/")) {
                item.setProductLabelQrCode(buildProductLabelQrCode(itemSerial, claimCode));
                dirty = true;
            }

            if (safeTrim(item.getCertificateQrCode()).isBlank()) {
                item.setCertificateQrCode(buildCertificateQrCode(itemSerial));
                dirty = true;
            }

            if (safeTrim(item.getCurrentOwnerWallet()).isBlank() && !initialOwnerWallet.isBlank()) {
                item.setCurrentOwnerWallet(initialOwnerWallet);
                dirty = true;
            }

            if (dirty) {
                updated += 1;
            }
        }

        return updated;
    }

    private String resolveUniqueClaimCode(String preferred, Long currentItemId) {
        String preferredCode = safeTrim(preferred);
        if (!preferredCode.isBlank() && isClaimCodeAvailable(preferredCode, currentItemId)) {
            return preferredCode;
        }

        for (int attempt = 0; attempt < 20; attempt += 1) {
            String generated = generateClaimCode();
            if (isClaimCodeAvailable(generated, currentItemId)) {
                return generated;
            }
        }

        throw new InvalidStateException("Unable to generate unique claim code for product item");
    }

    private boolean isClaimCodeAvailable(String claimCode, Long currentItemId) {
        Optional<ProductItem> existing = productItemRepository.findByClaimCode(claimCode);
        if (existing.isEmpty()) {
            return true;
        }

        ProductItem existingItem = existing.get();
        return currentItemId != null && currentItemId.equals(existingItem.getId());
    }

    private String generateClaimCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, CLAIM_CODE_LENGTH);
    }

    private String buildNftQrCode(String itemSerial) {
        return "digitalseal://nft/" + itemSerial;
    }

    private String buildProductLabelQrCode(String itemSerial, String claimCode) {
        if (claimCode != null && !claimCode.isBlank()) {
            return claimCode;
        }
        return "digitalseal://label/" + itemSerial;
    }

    private String buildCertificateQrCode(String itemSerial) {
        return "digitalseal://certificate/" + itemSerial;
    }

    private String buildInlineMetadataDataUri(Product product, String itemSerial) {
        String safeSerial = truncateForMetadata(safeTrim(itemSerial), METADATA_ATTRIBUTE_MAX_LENGTH);

        String rawProductName = product != null ? safeTrim(product.getProductName()) : "";
        String compactProductName = rawProductName.isBlank()
            ? "Digital Seal Item"
            : truncateForMetadata(rawProductName, METADATA_NAME_MAX_LENGTH - 12);
        String metadataName = truncateForMetadata(compactProductName + " #" + safeSerial, METADATA_NAME_MAX_LENGTH);

        String rawDescription = product != null ? safeTrim(product.getDescription()) : "";
        String description = rawDescription.isBlank()
            ? "Digital Seal authenticated item."
            : truncateForMetadata(rawDescription, METADATA_DESCRIPTION_MAX_LENGTH);

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", metadataName);
        metadata.put("description", description);

        String imageUrl = product != null ? safeTrim(product.getImageUrl()) : "";
        if (!imageUrl.isBlank()) {
            metadata.put("image", imageUrl);
        }

        List<Map<String, String>> attributes = new ArrayList<>();
        addMetadataAttribute(attributes, "Serial", safeSerial);
        if (product != null) {
            addMetadataAttribute(attributes, "Code", truncateForMetadata(safeTrim(product.getProductCode()), METADATA_ATTRIBUTE_MAX_LENGTH));
            addMetadataAttribute(attributes, "Category", truncateForMetadata(product.getCategory() != null ? product.getCategory().name() : "", METADATA_ATTRIBUTE_MAX_LENGTH));

            if (product.getBrand() != null) {
                addMetadataAttribute(attributes, "Brand", truncateForMetadata(safeTrim(product.getBrand().getBrandName()), METADATA_ATTRIBUTE_MAX_LENGTH));
            }
        }

        metadata.put("attributes", attributes);

        try {
            String metadataJson = objectMapper.writeValueAsString(metadata);
            String encodedMetadata = Base64.getEncoder().encodeToString(metadataJson.getBytes(StandardCharsets.UTF_8));
            return INLINE_METADATA_PREFIX + encodedMetadata;
        } catch (Exception e) {
            throw new InvalidStateException("Failed to generate NFT metadata for serial: " + safeSerial);
        }
    }

    private void addMetadataAttribute(List<Map<String, String>> attributes, String traitType, String value) {
        String safeTraitType = truncateForMetadata(safeTrim(traitType), METADATA_ATTRIBUTE_MAX_LENGTH);
        String safeValue = truncateForMetadata(safeTrim(value), METADATA_ATTRIBUTE_MAX_LENGTH);

        if (safeTraitType.isBlank() || safeValue.isBlank()) {
            return;
        }

        Map<String, String> attribute = new LinkedHashMap<>();
        attribute.put("trait_type", safeTraitType);
        attribute.put("value", safeValue);
        attributes.add(attribute);
    }

    private String truncateForMetadata(String value, int maxLength) {
        String normalized = safeTrim(value);
        if (normalized.isBlank() || maxLength <= 0 || normalized.length() <= maxLength) {
            return normalized;
        }

        if (maxLength <= 3) {
            return normalized.substring(0, maxLength);
        }

        return normalized.substring(0, maxLength - 3) + "...";
    }

    private String safeTrim(String value) {
        return String.valueOf(value == null ? "" : value).trim();
    }

    private BigInteger resolveStaticEstimateGasPriceWei() {
        String rawValue = safeTrim(aprilFirstPolygonGasPriceWeiRaw);
        if (rawValue.isBlank()) {
            return DEFAULT_APRIL_FIRST_POLYGON_GAS_PRICE_WEI;
        }

        try {
            BigInteger parsed = new BigInteger(rawValue);
            if (parsed.signum() <= 0) {
                return DEFAULT_APRIL_FIRST_POLYGON_GAS_PRICE_WEI;
            }
            return parsed;
        } catch (Exception e) {
            return DEFAULT_APRIL_FIRST_POLYGON_GAS_PRICE_WEI;
        }
    }

    private BigInteger estimateStaticBatchGasLimit(int itemCount) {
        BigInteger safeItemCount = BigInteger.valueOf(Math.max(itemCount, 0));

        BigInteger unbufferedEstimate = STATIC_ESTIMATE_BATCH_GAS_BASE_UNITS
                .add(STATIC_ESTIMATE_GAS_PER_ITEM_UNITS.multiply(safeItemCount));

        BigInteger bufferedEstimate = unbufferedEstimate
                .multiply(STATIC_ESTIMATE_GAS_BUFFER_NUMERATOR)
                .divide(STATIC_ESTIMATE_GAS_BUFFER_DENOMINATOR);

        return bufferedEstimate
                .max(STATIC_ESTIMATE_MIN_BATCH_GAS_UNITS)
                .min(STATIC_ESTIMATE_MAX_BATCH_GAS_UNITS);
    }

    private int countMintBatchChunks(int itemCount) {
        int safeItemCount = Math.max(itemCount, 0);
        if (safeItemCount == 0) {
            return 0;
        }

        return (safeItemCount + MAX_MINT_ITEMS_PER_BATCH_TX - 1) / MAX_MINT_ITEMS_PER_BATCH_TX;
    }

    private BigInteger nonNegativeOrZero(BigInteger value) {
        return value != null && value.signum() > 0 ? value : BigInteger.ZERO;
    }

    private BigInteger maxPositive(BigInteger left, BigInteger right) {
        BigInteger safeLeft = nonNegativeOrZero(left);
        BigInteger safeRight = nonNegativeOrZero(right);
        return safeLeft.compareTo(safeRight) >= 0 ? safeLeft : safeRight;
    }

    private String formatWeiToPol(BigInteger wei) {
        BigInteger safeWei = wei == null ? BigInteger.ZERO : wei;
        BigDecimal pol = new BigDecimal(safeWei)
                .divide(WEI_PER_POL, 9, RoundingMode.HALF_UP)
                .stripTrailingZeros();
        return pol.toPlainString();
    }

    private String resolveBrandOwnerWalletOrThrow(Product product) {
        String brandWallet = product != null && product.getBrand() != null
                ? safeTrim(product.getBrand().getCompanyWalletAddress())
                : "";

        if (brandWallet.isBlank()) {
            throw new InvalidStateException("Brand wallet address is required before listing collection items");
        }

        return brandWallet;
    }
    
    /**
     * Delete a collection. Products in this collection become standalone (collection_id = null).
     */
    @Transactional
    public void deleteCollection(Long userId, Long brandId, Long collectionId) {
        verifyBrandOwnership(userId, brandId);
        
        Collection collection = collectionRepository.findByIdAndBrandId(collectionId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found or doesn't belong to this brand"));
        
        // Products FK has ON DELETE SET NULL, so they'll become standalone
        collectionRepository.delete(collection);
        log.info("Collection '{}' deleted by user ID: {}", collection.getCollectionName(), userId);
    }
    
    /**
     * Verify the user owns the brand
     */
    private Brand verifyBrandOwnership(Long userId, Long brandId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found"));
        
        if (!brand.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You don't own this brand");
        }
        
        return brand;
    }
    
    private CollectionResponse mapToResponse(Collection collection, Long productCount) {
        return CollectionResponse.builder()
                .id(collection.getId())
                .brandId(collection.getBrand().getId())
                .brandName(collection.getBrand().getBrandName())
            .brandLogo(collection.getBrand().getLogo())
                .collectionName(collection.getCollectionName())
                .description(collection.getDescription())
                .imageUrl(collection.getImageUrl())
                .season(collection.getSeason())
                .isLimitedEdition(collection.getIsLimitedEdition())
                .releaseDate(collection.getReleaseDate())
            .status(collection.getStatus())
            .tag(collection.getTag())
            .salesEndAt(collection.getSalesEndAt())
            .tagColor(collection.getTagColor())
            .tagTextColor(collection.getTagTextColor())
                .productCount(productCount)
            .itemsCount(productCount)
                .createdAt(collection.getCreatedAt())
                .updatedAt(collection.getUpdatedAt())
                .build();
    }
}
