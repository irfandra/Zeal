package com.digitalseal.service;

import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.model.entity.Collection;
import com.digitalseal.model.entity.CollectionStatus;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.OwnershipHistory;
import com.digitalseal.model.entity.Product;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.ProductStatus;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.model.entity.TransferType;
import com.digitalseal.repository.CollectionRepository;
import com.digitalseal.repository.OwnershipHistoryRepository;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.ProductRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class MarketplaceLifecycleService {

    private static final String BURN_WALLET = "0x000000000000000000000000000000000000dEaD";

    private final CollectionRepository collectionRepository;
    private final ProductRepository productRepository;
    private final ProductItemRepository productItemRepository;
    private final OwnershipHistoryRepository ownershipHistoryRepository;
    private final BlockchainService blockchainService;
    private final PlatformLogService platformLogService;

    
    @Scheduled(fixedDelayString = "${app.marketplace.expiry-check-ms:60000}")
    @Transactional
    public void expireEndedListings() {
        LocalDateTime now = LocalDateTime.now();
        List<Collection> endedCollections = collectionRepository
                .findByStatusAndSalesEndAtLessThanEqual(CollectionStatus.LISTED, now);

        if (endedCollections.isEmpty()) {
            return;
        }

        for (Collection collection : endedCollections) {
            expireCollectionAndBurnUnsold(collection, now);
        }
    }

    
    @Transactional
    public Collection forceExpireCollectionNow(Collection collection) {
        if (collection == null) {
            throw new InvalidStateException("Collection is required");
        }

        if (collection.getStatus() == CollectionStatus.EXPIRED) {
            return collection;
        }

        if (collection.getStatus() != CollectionStatus.LISTED) {
            throw new InvalidStateException("Only LISTED collections can be ended immediately");
        }

        LocalDateTime now = LocalDateTime.now();
        if (collection.getSalesEndAt() == null || collection.getSalesEndAt().isAfter(now)) {
            collection.setSalesEndAt(now);
        }

        return expireCollectionAndBurnUnsold(collection, now);
    }

    private Collection expireCollectionAndBurnUnsold(Collection collection, LocalDateTime now) {
        int burnedItems = 0;

        List<Product> products = productRepository.findByCollectionId(collection.getId());
        for (Product product : products) {
            burnedItems += burnUnsoldProductItems(product, now);

            long availableAfterBurn = productItemRepository
                    .countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);

            if ((product.getStatus() == ProductStatus.LISTED || product.getStatus() == ProductStatus.PREMINTED)
                    && availableAfterBurn <= 0) {
                product.setStatus(ProductStatus.SOLD_OUT);
            }

            if (collection.getSalesEndAt() != null
                    && (product.getListingDeadline() == null || product.getListingDeadline().isAfter(collection.getSalesEndAt()))) {
                product.setListingDeadline(collection.getSalesEndAt());
            }

            productRepository.save(product);
        }

        collection.setStatus(CollectionStatus.EXPIRED);
        Collection savedCollection = collectionRepository.save(collection);

        log.info("Collection '{}' expired. Burned {} unsold items.", collection.getCollectionName(), burnedItems);
        platformLogService.warn(
                LogCategory.PRODUCT,
                "COLLECTION_EXPIRED",
                null,
                null,
                "COLLECTION",
                collection.getId().toString(),
                "Collection: " + collection.getCollectionName() + " | Burned unsold items: " + burnedItems
        );

        return savedCollection;
    }

    private int burnUnsoldProductItems(Product product, LocalDateTime now) {
        List<ProductItem> unsoldItems = productItemRepository.findByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);
        if (unsoldItems.isEmpty()) {
            return 0;
        }

        int burnedCount = 0;

        for (ProductItem item : unsoldItems) {
            String burnTxHash = null;

            if (item.getTokenId() != null && blockchainService.isAvailable()) {
                try {
                    burnTxHash = blockchainService.burnToken(item.getTokenId());
                } catch (Exception exception) {
                    log.warn("On-chain burn failed for item {}: {}", item.getItemSerial(), exception.getMessage());
                    platformLogService.error(
                            LogCategory.BLOCKCHAIN,
                            "NFT_BURN_FAILED",
                            null,
                            null,
                            "PRODUCT_ITEM",
                            item.getId().toString(),
                            "Item: " + item.getItemSerial(),
                            exception.getClass().getSimpleName() + ": " + exception.getMessage()
                    );
                }
            }

            String fromWallet = item.getCurrentOwnerWallet();
            if (fromWallet == null || fromWallet.isBlank()) {
                fromWallet = product.getBrand() != null ? product.getBrand().getCompanyWalletAddress() : null;
            }

            item.setSealStatus(SealStatus.BURNED);
            item.setClaimCode(null);
            item.setClaimCodeHash(null);
            item.setCurrentOwner(null);
            item.setCurrentOwnerWallet(BURN_WALLET);
            if (burnTxHash != null && !burnTxHash.isBlank()) {
                item.setTransferTxHash(burnTxHash);
            }
            productItemRepository.save(item);

            ownershipHistoryRepository.save(OwnershipHistory.builder()
                    .productItem(item)
                    .fromWallet(fromWallet)
                    .toWallet(BURN_WALLET)
                    .transferType(TransferType.BURN)
                    .txHash(burnTxHash)
                    .notes("Auto-burned after collection sale ended")
                    .transferredAt(now)
                    .build());

            burnedCount += 1;
        }

        return burnedCount;
    }
}
