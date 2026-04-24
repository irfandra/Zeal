package com.digitalseal.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digitalseal.dto.request.ProductSpecificationRequest;
import com.digitalseal.dto.response.ProductSpecificationResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.digitalseal.dto.request.CreateProductRequest;
import com.digitalseal.dto.request.PremintProductRequest;
import com.digitalseal.dto.request.PublishProductRequest;
import com.digitalseal.dto.request.UpdateProductRequest;
import com.digitalseal.dto.response.ProductResponse;
import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.exception.ResourceNotFoundException;
import com.digitalseal.exception.UnauthorizedException;
import com.digitalseal.model.entity.Brand;
import com.digitalseal.model.entity.Collection;
import com.digitalseal.model.entity.Product;
import com.digitalseal.model.entity.ProductCategory;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.ProductStatus;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.repository.BrandRepository;
import com.digitalseal.repository.CollectionRepository;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.ProductRepository;
import com.digitalseal.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ProductService {

    private static final String PRODUCT_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int PRODUCT_CODE_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final TypeReference<List<ProductSpecificationResponse>> PRODUCT_SPEC_LIST_TYPE =
        new TypeReference<>() {};
    
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CollectionRepository collectionRepository;
    private final ProductItemRepository productItemRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    
    
    @Transactional
    public ProductResponse createProduct(Long userId, Long brandId, CreateProductRequest request) {
        Brand brand = verifyBrandOwnership(userId, brandId);

        Collection collection = null;
        if (request.getCollectionId() != null) {
            collection = collectionRepository.findByIdAndBrandId(request.getCollectionId(), brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found or doesn't belong to this brand"));
        }
        
        Product product = Product.builder()
                .brand(brand)
                .collection(collection)
            .productCode(generateProductCode())
                .productName(request.getProductName())
                .description(request.getDescription())
                .category(request.getCategory())
                .imageUrl(request.getImageUrl())
                .specificationsJson(serializeSpecifications(request.getSpecifications()))
                .price(request.getPrice())
                .status(ProductStatus.DRAFT)
                .build();
        
        Product saved = productRepository.save(product);
        log.info("Product '{}' (Code: {}) created under brand ID: {} by user ID: {}",
            saved.getProductName(), saved.getProductCode(), brandId, userId);
        
        return mapToResponse(saved);
    }
    
    
    public List<ProductResponse> getProductsByBrand(Long brandId, ProductCategory category, ProductStatus status) {
        brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found"));
        
        List<Product> products;
        
        if (category != null && status != null) {
            products = productRepository.findByBrandIdAndCategoryAndStatus(brandId, category, status);
        } else if (category != null) {
            products = productRepository.findByBrandIdAndCategory(brandId, category);
        } else if (status != null) {
            products = productRepository.findByBrandIdAndStatus(brandId, status);
        } else {
            products = productRepository.findByBrandId(brandId);
        }
        
        return products.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    
    public List<ProductResponse> getProductsByCollection(Long collectionId) {
        collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found"));
        
        return productRepository.findByCollectionId(collectionId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    
    public ProductResponse getProductById(String productId) {
        Product product = productRepository.findByProductCode(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return mapToResponse(product);
    }
    
    
    @Transactional
    public ProductResponse updateProduct(Long userId, Long brandId, String productId, UpdateProductRequest request) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() == ProductStatus.DRAFT) {

            if (request.getProductName() != null) product.setProductName(request.getProductName());
            if (request.getDescription() != null) product.setDescription(request.getDescription());
            if (request.getCategory() != null) product.setCategory(request.getCategory());
            if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
            if (request.getSpecifications() != null) {
                product.setSpecificationsJson(serializeSpecifications(request.getSpecifications()));
            }
            if (request.getPrice() != null) product.setPrice(request.getPrice());
        } else if (product.getStatus() == ProductStatus.PUBLISHED) {

            if (request.getPrice() != null) product.setPrice(request.getPrice());

            if (request.getProductName() != null || request.getDescription() != null || 
                request.getCategory() != null || request.getImageUrl() != null || request.getSpecifications() != null) {
                throw new InvalidStateException("Only price can be edited in PUBLISHED status");
            }
        } else {
            throw new InvalidStateException("Product cannot be edited in " + product.getStatus() + " status");
        }
        
        Product updated = productRepository.save(product);
        log.info("Product '{}' (ID: {}) updated by user ID: {}", updated.getProductName(), productId, userId);
        
        return mapToResponse(updated);
    }
    
    
    @Transactional
    public void deleteProduct(Long userId, Long brandId, String productId) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() != ProductStatus.DRAFT) {
            throw new InvalidStateException("Only DRAFT products can be deleted. Current status: " + product.getStatus());
        }
        
        productRepository.delete(product);
        log.info("Product '{}' (ID: {}) deleted by user ID: {}", product.getProductName(), productId, userId);
    }
    
    
    @Transactional
    public ProductResponse publishProduct(Long userId, Long brandId, String productId, PublishProductRequest request) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() != ProductStatus.DRAFT) {
            throw new InvalidStateException("Only DRAFT products can be published. Current status: " + product.getStatus());
        }
        
        product.setPrice(request.getPrice());
        if (request.getListingDeadline() != null) {
            product.setListingDeadline(request.getListingDeadline());
        }
        product.setStatus(ProductStatus.PUBLISHED);
        
        Product saved = productRepository.save(product);
        log.info("Product '{}' (ID: {}) published by user ID: {}", saved.getProductName(), productId, userId);
        
        return mapToResponse(saved);
    }
    
    
    @Transactional
    public ProductResponse premintProduct(Long userId, Long brandId, String productId, PremintProductRequest request) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() != ProductStatus.PUBLISHED) {
            throw new InvalidStateException("Only PUBLISHED products can be pre-minted. Current status: " + product.getStatus());
        }
        
        if (product.getPrice() == null) {
            throw new InvalidStateException("Product must have a price set before pre-minting");
        }

        String brandOwnerWallet = resolveBrandOwnerWalletOrThrow(product);

        if (!product.getItems().isEmpty()) {
            throw new InvalidStateException("Product items already generated for this product");
        }

        int mintQuantity = request.getQuantity();

        for (int i = 1; i <= mintQuantity; i++) {
            String itemSerial = product.getProductCode() + "-" + String.format("%04d", i);

            ProductItem item = ProductItem.builder()
                    .product(product)
                .itemSerial(itemSerial)
                    .itemIndex(i)
                .currentOwnerWallet(brandOwnerWallet)
                    .sealStatus(SealStatus.PRE_MINTED)
                    .build();
            product.getItems().add(item);
        }

        product.setStatus(ProductStatus.PREMINTED);
        
        Product saved = productRepository.save(product);
        log.info("Product '{}' prepared {} off-chain item rows. NFT/QR will be generated on LISTED.",
            saved.getProductName(), mintQuantity);
        
        log.info("Product '{}' (Code: {}) pre-minted with {} items by user ID: {}",
            saved.getProductName(), productId, mintQuantity, userId);
        
        return mapToResponse(saved);
    }
    
    
    @Transactional
    public ProductResponse listProduct(Long userId, Long brandId, String productId) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() != ProductStatus.PREMINTED) {
            throw new InvalidStateException("Only PREMINTED products can be listed. Current status: " + product.getStatus());
        }

        long availableItems = productItemRepository.countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);
        if (availableItems <= 0) {
            throw new InvalidStateException("Cannot list product without available pre-minted items");
        }
        
        product.setStatus(ProductStatus.LISTED);
        product.setListedAt(LocalDateTime.now());
        
        Product saved = productRepository.save(product);
        log.info("Product '{}' (ID: {}) listed on marketplace by user ID: {}", saved.getProductName(), productId, userId);
        
        return mapToResponse(saved);
    }
    
    
    @Transactional
    public ProductResponse delistProduct(Long userId, Long brandId, String productId) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() != ProductStatus.LISTED && product.getStatus() != ProductStatus.SOLD_OUT) {
            throw new InvalidStateException("Only LISTED or SOLD_OUT products can be delisted. Current status: " + product.getStatus());
        }


        
        Product saved = productRepository.save(product);
        log.info("Product '{}' (ID: {}) delisted by user ID: {}", saved.getProductName(), productId, userId);
        
        return mapToResponse(saved);
    }
    
    
    @Transactional
    public ProductResponse archiveProduct(Long userId, Long brandId, String productId) {
        verifyBrandOwnership(userId, brandId);
        
        Product product = productRepository.findByProductCodeAndBrandId(productId, brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or doesn't belong to this brand"));
        
        if (product.getStatus() != ProductStatus.COMPLETED) {
            throw new InvalidStateException("Only COMPLETED products can be archived. Current status: " + product.getStatus());
        }


        
        Product saved = productRepository.save(product);
        log.info("Product '{}' (ID: {}) archived by user ID: {}", saved.getProductName(), productId, userId);
        
        return mapToResponse(saved);
    }
    
    
    public ProductCategory[] getCategories() {
        return ProductCategory.values();
    }
    
    
    public Brand verifyBrandOwnership(Long userId, Long brandId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found"));
        
        if (!brand.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You don't own this brand");
        }
        
        return brand;
    }
    
    public ProductResponse mapToResponse(Product product) {
        long totalQuantity = productItemRepository.countByProductId(product.getId());
        long availableQuantity = productItemRepository.countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);

        return ProductResponse.builder()
            .id(product.getProductCode())
                .brandId(product.getBrand().getId())
                .brandName(product.getBrand().getBrandName())
                .collectionId(product.getCollection() != null ? product.getCollection().getId() : null)
                .collectionName(product.getCollection() != null ? product.getCollection().getCollectionName() : null)
                .productName(product.getProductName())
                .description(product.getDescription())
                .category(product.getCategory())
                .imageUrl(product.getImageUrl())
                .specifications(deserializeSpecifications(product.getSpecificationsJson()))
                .price(product.getPrice())
            .totalQuantity((int) totalQuantity)
            .availableQuantity((int) availableQuantity)
                .contractAddress(product.getContractAddress())
                .metadataBaseUri(product.getMetadataBaseUri())
                .status(product.getStatus())
                .listedAt(product.getListedAt())
                .listingDeadline(product.getListingDeadline())
                .premintedAt(product.getPremintedAt())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private String serializeSpecifications(List<ProductSpecificationRequest> specifications) {
        if (specifications == null) {
            return null;
        }

        List<ProductSpecificationResponse> normalized = specifications.stream()
            .map(specification -> ProductSpecificationResponse.builder()
                .aspect(specification != null && specification.getAspect() != null
                    ? specification.getAspect().trim()
                    : "")
                .details(specification != null && specification.getDetails() != null
                    ? specification.getDetails().trim()
                    : "")
                .build())
            .filter(specification -> !specification.getAspect().isBlank() && !specification.getDetails().isBlank())
            .collect(Collectors.toList());

        if (normalized.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(normalized);
        } catch (Exception e) {
            throw new InvalidStateException("Failed to serialize product specifications");
        }
    }

    private List<ProductSpecificationResponse> deserializeSpecifications(String specificationsJson) {
        if (specificationsJson == null || specificationsJson.isBlank()) {
            return List.of();
        }

        try {
            List<ProductSpecificationResponse> parsed = objectMapper.readValue(specificationsJson, PRODUCT_SPEC_LIST_TYPE);
            if (parsed == null || parsed.isEmpty()) {
                return List.of();
            }

            List<ProductSpecificationResponse> normalized = parsed.stream()
                .map(specification -> ProductSpecificationResponse.builder()
                    .aspect(specification != null && specification.getAspect() != null
                        ? specification.getAspect().trim()
                        : "")
                    .details(specification != null && specification.getDetails() != null
                        ? specification.getDetails().trim()
                        : "")
                    .build())
                .filter(specification -> !specification.getAspect().isBlank() && !specification.getDetails().isBlank())
                .collect(Collectors.toCollection(ArrayList::new));

            return normalized;
        } catch (Exception e) {
            log.warn("Failed to deserialize product specifications for product payload: {}", e.getMessage());
            return List.of();
        }
    }
    
        private String resolveBrandOwnerWalletOrThrow(Product product) {
        String brandWallet = product.getBrand() != null
            ? String.valueOf(product.getBrand().getCompanyWalletAddress() == null
                ? ""
                : product.getBrand().getCompanyWalletAddress()).trim()
            : "";

        if (brandWallet.isBlank()) {
            throw new InvalidStateException("Brand wallet address is required before pre-minting product items");
        }

        return brandWallet;
    }

    private String generateProductCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = randomCode(PRODUCT_CODE_LENGTH);
            if (!Boolean.TRUE.equals(productRepository.existsByProductCode(candidate))) {
                return candidate;
            }
        }

        String fallback = randomCode(PRODUCT_CODE_LENGTH - 1) + "Z";
        if (!Boolean.TRUE.equals(productRepository.existsByProductCode(fallback))) {
            return fallback;
        }
        throw new IllegalStateException("Failed to generate unique product code");
    }

    private String randomCode(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int idx = RANDOM.nextInt(PRODUCT_CODE_CHARS.length());
            builder.append(PRODUCT_CODE_CHARS.charAt(idx));
        }
        return builder.toString();
    }
}
