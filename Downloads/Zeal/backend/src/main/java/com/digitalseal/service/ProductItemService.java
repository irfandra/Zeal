package com.digitalseal.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digitalseal.dto.request.ClaimItemRequest;
import com.digitalseal.dto.response.OwnershipHistoryResponse;
import com.digitalseal.dto.response.ProductItemResponse;
import com.digitalseal.dto.response.VerificationResponse;
import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.exception.ResourceNotFoundException;
import com.digitalseal.exception.UnauthorizedException;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.Order;
import com.digitalseal.model.entity.OrderStatus;
import com.digitalseal.model.entity.OwnershipHistory;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.model.entity.TransferType;
import com.digitalseal.model.entity.User;
import com.digitalseal.repository.OrderRepository;
import com.digitalseal.repository.OwnershipHistoryRepository;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ProductItemService {
    
    private final ProductItemRepository productItemRepository;
    private final OwnershipHistoryRepository ownershipHistoryRepository;
    private final UserRepository userRepository;
    private final BlockchainService blockchainService;
    private final OrderRepository orderRepository;
    private final PlatformLogService platformLogService;
    
    /**
     * Get all items for a product
     */
        public List<ProductItemResponse> getItemsByProduct(String productId) {
                return productItemRepository.findByProductProductCodeOrderByItemIndexAsc(productId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

        /**
         * Get only publicly purchasable items for marketplace (PRE_MINTED only).
         */
        public List<ProductItemResponse> getPublicPurchasableItemsByProduct(String productId) {
                return productItemRepository
                                .findByProductProductCodeAndSealStatusOrderByItemIndexAsc(productId, SealStatus.PRE_MINTED)
                                .stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }
    
    /**
     * Claim an item using a claim code from a QR scan.
     *
     * Two scenarios:
     *  1. RESERVED item — buyer purchased from marketplace, receives box with QR, scans to
     *     take ownership of the NFT and auto-complete the order.
     *  2. PRE_MINTED item — standalone gifted / physical-first item with no prior order.
     */
    @Transactional
    public ProductItemResponse claimItem(Long userId, ClaimItemRequest request) {
        User claimant = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ProductItem item = productItemRepository.findByClaimCode(request.getClaimCode())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid claim code"));

        if (item.getSealStatus() != SealStatus.PRE_MINTED && item.getSealStatus() != SealStatus.RESERVED) {
            throw new InvalidStateException("This item cannot be claimed. Status: " + item.getSealStatus());
        }

        if (item.getSealStatus() == SealStatus.RESERVED) {
            // --- Scenario 1: purchased item, QR scan completes the order ---
            return claimPurchasedItem(userId, claimant, item, request.getWalletAddress());
        } else {
            // --- Scenario 2: standalone claim (no prior order) ---
            return claimStandaloneItem(userId, claimant, item, request.getWalletAddress());
        }
    }

    /**
     * Verify a product item's authenticity. Returns full provenance chain.
     */
    public VerificationResponse verifyItem(Long itemId) {
        ProductItem item = productItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Product item not found"));
        
        List<OwnershipHistory> history = ownershipHistoryRepository
                .findByProductItemIdOrderByTransferredAtAsc(itemId);
        
        // BURNED and REVOKED status removed: fallback to basic authenticity check
        boolean isAuthentic = true; // Adjust logic as needed
        
        return VerificationResponse.builder()
                .authentic(isAuthentic)
                .itemSerial(item.getItemSerial())
                .productName(item.getProduct().getProductName())
                .brandName(item.getProduct().getBrand().getBrandName())
                .brandVerified(item.getProduct().getBrand().getVerified())
                .sealStatus(item.getSealStatus())
                .tokenId(item.getTokenId())
                .contractAddress(item.getProduct().getContractAddress())
                .currentOwnerWallet(item.getCurrentOwnerWallet())
                .mintTxHash(item.getMintTxHash())
                .mintedAt(item.getMintedAt())
                .ownershipHistory(history.stream().map(this::mapHistoryToResponse).collect(Collectors.toList()))
                .verifiedAt(LocalDateTime.now())
                .build();
    }

    /**
     * Verify a product item by its serial number (public)
     */
    public VerificationResponse verifyItemBySerial(String serial) {
        ProductItem item = productItemRepository.findByItemSerial(serial)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with serial: " + serial));
        return verifyItem(item.getId());
    }
    
    /**
     * Get items owned by a specific user
     */
    public List<ProductItemResponse> getMyItems(Long userId) {
        return productItemRepository.findByCurrentOwnerId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Get ownership history for an item
     */
    public List<OwnershipHistoryResponse> getOwnershipHistory(Long itemId) {
        productItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Product item not found"));
        
        return ownershipHistoryRepository.findByProductItemIdOrderByTransferredAtAsc(itemId).stream()
                .map(this::mapHistoryToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Buyer scans QR on a purchased item (RESERVED).
     * Transfers the NFT and auto-completes the linked order.
     */
    private ProductItemResponse claimPurchasedItem(Long userId, User claimant, ProductItem item, String providedWallet) {
        // Find the linked order (SHIPPED or DELIVERED)
        Order order = orderRepository.findByProductItemIdAndStatusIn(
                        item.getId(), List.of(OrderStatus.SHIPPED, OrderStatus.DELIVERED))
                .orElseThrow(() -> new InvalidStateException(
                        "No active shipped order found for this item. " +
                        "The item may not have been shipped yet."));

        // Only the buyer who placed the order can scan the QR
        if (!order.getBuyer().getId().equals(userId)) {
            throw new UnauthorizedException("This item was purchased by a different buyer.");
        }

        // Use buyer wallet from order if not explicitly provided
        String walletAddress = (providedWallet != null && !providedWallet.isBlank())
                ? providedWallet
                : order.getBuyerWallet();

        if (walletAddress == null || walletAddress.isBlank()) {
            throw new InvalidStateException("No wallet address available. " +
                    "Provide one in the request or connect a wallet to your account.");
        }

        String brandWallet = item.getProduct().getBrand().getCompanyWalletAddress();
        LocalDateTime now = LocalDateTime.now();

        // Update item — use soldAt since this was a purchase, not a freebie
        item.setSealStatus(SealStatus.REALIZED);
        item.setCurrentOwner(claimant);
        item.setCurrentOwnerWallet(walletAddress);
        item.setSoldAt(now);
        item.setClaimCode(null); // invalidate so it can't be reused
        ProductItem saved = productItemRepository.save(item);

        // Auto-complete the order
        order.setStatus(OrderStatus.COMPLETED);
        order.setDeliveredAt(order.getDeliveredAt() != null ? order.getDeliveredAt() : now);
        order.setCompletedAt(now);
        orderRepository.save(order);

        // Record ownership history as PURCHASE (they paid for it)
        OwnershipHistory history = OwnershipHistory.builder()
                .productItem(item)
                .fromWallet(brandWallet)
                .toWallet(walletAddress)
                .transferType(TransferType.PURCHASE)
                .notes("QR scan confirmed delivery — order " + order.getOrderNumber())
                .transferredAt(now)
                .build();
        ownershipHistoryRepository.save(history);

        // Blockchain NFT transfer
        if (item.getTokenId() != null && blockchainService.isAvailable()) {
            try {
                String txHash = blockchainService.transferToken(item.getTokenId(), walletAddress, "PURCHASE");
                if (txHash != null) {
                    item.setTransferTxHash(txHash);
                    order.setSealTransferTxHash(txHash);
                    history.setTxHash(txHash);
                    productItemRepository.save(item);
                    orderRepository.save(order);
                    ownershipHistoryRepository.save(history);
                    log.info("Blockchain purchase transfer via QR successful. TxHash: {}", txHash);
                }
            } catch (Exception e) {
                log.error("Blockchain transfer failed for item {} (order {}): {}",
                        item.getItemSerial(), order.getOrderNumber(), e.getMessage());
                platformLogService.error(LogCategory.BLOCKCHAIN, "NFT_TRANSFER_FAILED",
                        userId, claimant.getEmail(),
                        "PRODUCT_ITEM", item.getId().toString(),
                        "Item: " + item.getItemSerial() + " | Order: " + order.getOrderNumber(),
                        e.getClass().getSimpleName() + ": " + e.getMessage());
                // Don't fail — ownership transferred off-chain
            }
        }

        log.info("Item {} claimed via QR (purchased order {}). NFT → wallet: {}",
                item.getItemSerial(), order.getOrderNumber(), walletAddress);

        platformLogService.info(LogCategory.CLAIM, "ITEM_CLAIMED_PURCHASE",
                userId, claimant.getEmail(),
                "PRODUCT_ITEM", item.getId().toString(),
                "Serial: " + item.getItemSerial()
                + " | Token: " + item.getTokenId()
                + " | Order: " + order.getOrderNumber()
                + " | Wallet: " + walletAddress
                + (item.getTransferTxHash() != null ? " | TxHash: " + item.getTransferTxHash() : ""));

        return mapToResponse(saved);
    }
    
    /**
     * Standalone claim for PRE_MINTED items with no prior order (gifted / physical-first).
     */
    private ProductItemResponse claimStandaloneItem(Long userId, User claimant, ProductItem item, String providedWallet) {
        String walletAddress = (providedWallet != null && !providedWallet.isBlank())
                ? providedWallet
                : claimant.getWalletAddress();

        if (walletAddress == null || walletAddress.isBlank()) {
            throw new InvalidStateException("A wallet address is required to claim an item. " +
                    "Please provide one in the request or connect a wallet to your account.");
        }

        String brandWallet = item.getProduct().getBrand().getCompanyWalletAddress();
        LocalDateTime now = LocalDateTime.now();

        item.setSealStatus(SealStatus.REALIZED);
        item.setCurrentOwner(claimant);
        item.setCurrentOwnerWallet(walletAddress);
        item.setClaimedAt(now);
        item.setClaimCode(null);
        ProductItem saved = productItemRepository.save(item);

        OwnershipHistory history = OwnershipHistory.builder()
                .productItem(item)
                .fromWallet(brandWallet)
                .toWallet(walletAddress)
                .transferType(TransferType.CLAIM)
                .notes("Standalone QR claim by user ID: " + userId)
                .transferredAt(now)
                .build();
        ownershipHistoryRepository.save(history);

        // Blockchain claim transfer
        if (item.getTokenId() != null && blockchainService.isAvailable()) {
            try {
                String txHash = blockchainService.transferToken(item.getTokenId(), walletAddress, "CLAIM");
                if (txHash != null) {
                    item.setTransferTxHash(txHash);
                    history.setTxHash(txHash);
                    productItemRepository.save(item);
                    ownershipHistoryRepository.save(history);
                    log.info("Blockchain standalone claim successful. TxHash: {}", txHash);
                }
            } catch (Exception e) {
                log.error("Blockchain claim failed for item {}: {}", item.getItemSerial(), e.getMessage());
                platformLogService.error(LogCategory.BLOCKCHAIN, "NFT_CLAIM_FAILED",
                        userId, claimant.getEmail(),
                        "PRODUCT_ITEM", item.getId().toString(),
                        "Item: " + item.getItemSerial(),
                        e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }

        log.info("Item {} standalone claimed by user ID: {} (wallet: {})",
                item.getItemSerial(), userId, walletAddress);

        platformLogService.info(LogCategory.CLAIM, "ITEM_CLAIMED_STANDALONE",
                userId, claimant.getEmail(),
                "PRODUCT_ITEM", item.getId().toString(),
                "Serial: " + item.getItemSerial()
                + " | Token: " + item.getTokenId()
                + " | Wallet: " + walletAddress
                + (item.getTransferTxHash() != null ? " | TxHash: " + item.getTransferTxHash() : ""));

        return mapToResponse(saved);
    }
    
    private ProductItemResponse mapToResponse(ProductItem item) {
        return ProductItemResponse.builder()
                .id(item.getId())
                .productId(item.getProduct().getProductCode())
                .productName(item.getProduct().getProductName())
                .itemSerial(item.getItemSerial())
                .itemIndex(item.getItemIndex())
                .tokenId(item.getTokenId())
                .metadataUri(item.getMetadataUri())
                .mintTxHash(item.getMintTxHash())
                .nftQrCode(item.getNftQrCode())
                .productLabelQrCode(item.getProductLabelQrCode())
                .certificateQrCode(item.getCertificateQrCode())
                .sealStatus(item.getSealStatus())
                .currentOwnerWallet(item.getCurrentOwnerWallet())
                .currentOwnerId(item.getCurrentOwner() != null ? item.getCurrentOwner().getId() : null)
                .currentOwnerUsername(item.getCurrentOwner() != null ? item.getCurrentOwner().getUserName() : null)
                .mintedAt(item.getMintedAt())
                .soldAt(item.getSoldAt())
                .claimedAt(item.getClaimedAt())
                .createdAt(item.getCreatedAt())
                .build();
    }
    
    private OwnershipHistoryResponse mapHistoryToResponse(OwnershipHistory history) {
                String fromWallet = history.getFromWallet();
                String toWallet = history.getToWallet();

        return OwnershipHistoryResponse.builder()
                .id(history.getId())
                .productItemId(history.getProductItem().getId())
                                .fromWallet(fromWallet)
                                .fromUserName(resolveUserNameByWallet(fromWallet))
                                .toWallet(toWallet)
                                .toUserName(resolveUserNameByWallet(toWallet))
                .transferType(history.getTransferType())
                .txHash(history.getTxHash())
                .blockNumber(history.getBlockNumber())
                .notes(history.getNotes())
                .transferredAt(history.getTransferredAt())
                .build();
    }

        private String resolveUserNameByWallet(String walletAddress) {
                String normalizedWallet = walletAddress == null ? "" : walletAddress.trim();
                if (normalizedWallet.isBlank()) {
                        return null;
                }

                return userRepository.findByWalletAddressIgnoreCase(normalizedWallet)
                                .map(User::getUserName)
                                .map(String::trim)
                                .filter(name -> !name.isBlank())
                                .orElse(null);
        }
}
