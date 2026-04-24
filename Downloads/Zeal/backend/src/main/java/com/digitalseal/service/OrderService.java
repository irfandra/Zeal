package com.digitalseal.service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digitalseal.dto.request.ConfirmPaymentRequest;
import com.digitalseal.dto.request.CreateOrderRequest;
import com.digitalseal.dto.request.UpdateShippingRequest;
import com.digitalseal.dto.response.OrderFeeEstimateResponse;
import com.digitalseal.dto.response.OrderResponse;
import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.exception.ResourceNotFoundException;
import com.digitalseal.exception.UnauthorizedException;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.Collection;
import com.digitalseal.model.entity.Order;
import com.digitalseal.model.entity.OrderStatus;
import com.digitalseal.model.entity.OwnershipHistory;
import com.digitalseal.model.entity.Product;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.ProductStatus;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.model.entity.TransferType;
import com.digitalseal.model.entity.User;
import com.digitalseal.repository.OrderRepository;
import com.digitalseal.repository.OwnershipHistoryRepository;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.ProductRepository;
import com.digitalseal.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class OrderService {

    private static final BigDecimal PLATFORM_FEE_RATE = new BigDecimal("0.05");
    private static final BigDecimal DELIVERY_FEE = new BigDecimal("500");
    private static final BigInteger SIMPLE_PAYMENT_GAS_LIMIT = BigInteger.valueOf(21_000L);
    private static final BigDecimal WEI_PER_POL = new BigDecimal("1000000000000000000");
    private static final int POL_DECIMAL_SCALE = 8;
    
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ProductItemRepository productItemRepository;
    private final UserRepository userRepository;
    private final OwnershipHistoryRepository ownershipHistoryRepository;
    private final BlockchainService blockchainService;
    private final PlatformLogService platformLogService;
    
    /**
     * Create a purchase order for a listed product. Reserves the next available item.
     */
    @Transactional
    public OrderResponse createOrder(Long buyerId, String productId, CreateOrderRequest request) {
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Product product = productRepository.findByProductCode(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        ensureSaleWindowOpen(product);
        
        if (product.getStatus() != ProductStatus.LISTED) {
            throw new InvalidStateException("Product is not available for purchase. Status: " + product.getStatus());
        }
        
        long availableQuantity = productItemRepository.countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);
        if (availableQuantity <= 0) {
            throw new InvalidStateException("Product is sold out");
        }
        
        // Reserve the next available product item
        ProductItem item = productItemRepository.findFirstAvailableItemForUpdate(product.getId())
                .orElseThrow(() -> new InvalidStateException("No available items for this product"));
        
        item.setSealStatus(SealStatus.RESERVED);
        productItemRepository.save(item);
        
        long availableAfterReservation = productItemRepository.countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);
        if (availableAfterReservation == 0) {
            product.setStatus(ProductStatus.SOLD_OUT);
        } else if (product.getStatus() == ProductStatus.SOLD_OUT) {
            product.setStatus(ProductStatus.LISTED);
        }
        productRepository.save(product);
        
        // Create the order
        String orderNumber = generateOrderNumber();
        OrderFeeBreakdown feeBreakdown = calculateOrderFeeBreakdown(product);
        BigDecimal totalPrice = feeBreakdown.totalPrice();

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .product(product)
                .productItem(item)
                .buyer(buyer)
                .buyerWallet(request.getBuyerWallet())
                .quantity(1)
            .unitPrice(feeBreakdown.unitPrice())
                .totalPrice(totalPrice)
                .shippingAddress(request.getShippingAddress())
                .status(OrderStatus.PENDING)
                .build();
        
        Order saved = orderRepository.save(order);
        log.info("Order {} created for product '{}' (item: {}) by user ID: {}",
                orderNumber, product.getProductName(), item.getItemSerial(), buyerId);

        log.info(
            "Order {} fee breakdown: unitPrice={} platformFee={} deliveryFee={} transactionFee={} gasPriceWei={} gasLimit={}",
            orderNumber,
            feeBreakdown.unitPrice(),
            feeBreakdown.platformFee(),
            feeBreakdown.deliveryFee(),
            feeBreakdown.transactionFee(),
            feeBreakdown.estimatedGasPriceWei(),
            feeBreakdown.estimatedGasLimit()
        );

        platformLogService.info(LogCategory.ORDER, "ORDER_CREATED",
                buyerId, buyer.getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + orderNumber
                + " | Product: " + product.getProductName()
                + " | Item: " + item.getItemSerial()
                + " | Price: " + order.getTotalPrice());

        return mapToResponse(saved);
    }

    /**
     * Estimate checkout fee breakdown for one product item.
     */
    public OrderFeeEstimateResponse estimateOrderFee(Long buyerId, String productId) {
        userRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Product product = productRepository.findByProductCode(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        ensureSaleWindowOpen(product);

        if (product.getStatus() != ProductStatus.LISTED) {
            throw new InvalidStateException("Product is not available for purchase. Status: " + product.getStatus());
        }

        long availableQuantity = productItemRepository.countByProductIdAndSealStatus(product.getId(), SealStatus.PRE_MINTED);
        if (availableQuantity <= 0) {
            throw new InvalidStateException("Product is sold out");
        }

        OrderFeeBreakdown breakdown = calculateOrderFeeBreakdown(product);

        return OrderFeeEstimateResponse.builder()
                .productId(product.getProductCode())
                .unitPrice(breakdown.unitPrice())
                .platformFeeRate(PLATFORM_FEE_RATE)
                .platformFee(breakdown.platformFee())
                .deliveryFee(breakdown.deliveryFee())
                .transactionFee(breakdown.transactionFee())
                .estimatedGasLimit(breakdown.estimatedGasLimit().toString())
                .estimatedGasPriceWei(breakdown.estimatedGasPriceWei().toString())
                .totalPrice(breakdown.totalPrice())
                .build();
    }
    
    /**
     * Confirm payment for an order (buyer submits tx hash)
     */
    @Transactional
    public OrderResponse confirmPayment(Long buyerId, Long orderId, ConfirmPaymentRequest request) {
        Order order = orderRepository.findByIdAndBuyerId(orderId, buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new InvalidStateException("Payment can only be confirmed for PENDING orders. Status: " + order.getStatus());
        }
        
        order.setPaymentTxHash(request.getPaymentTxHash());
        order.setPaymentConfirmedAt(LocalDateTime.now());
        order.setStatus(OrderStatus.PAYMENT_RECEIVED);
        
        Order saved = orderRepository.save(order);
        log.info("Payment confirmed for order {} (tx: {})", order.getOrderNumber(), request.getPaymentTxHash());

        platformLogService.info(LogCategory.ORDER, "PAYMENT_CONFIRMED",
                buyerId, order.getBuyer().getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + order.getOrderNumber() + " | TxHash: " + request.getPaymentTxHash());

        return mapToResponse(saved);
    }
    
    /**
     * Brand processes the order.
     * Supports direct collector request acceptance by auto-confirming payment:
     * PENDING (with buyer wallet) -> PAYMENT_RECEIVED -> PROCESSING.
     */
    @Transactional
    public OrderResponse processOrder(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        // Verify brand ownership
        verifyBrandOwnerForOrder(userId, order);
        
        if (order.getStatus() == OrderStatus.PENDING) {
            String buyerWallet = order.getBuyerWallet();
            if (buyerWallet == null || buyerWallet.isBlank()) {
                throw new InvalidStateException("Buyer wallet is required before creator can accept request.");
            }

            if (order.getPaymentTxHash() == null || order.getPaymentTxHash().isBlank()) {
                order.setPaymentTxHash("AUTO_ACCEPTED_" + UUID.randomUUID().toString().replace("-", ""));
            }
            order.setPaymentConfirmedAt(LocalDateTime.now());
            order.setStatus(OrderStatus.PAYMENT_RECEIVED);
        }

        if (order.getStatus() != OrderStatus.PAYMENT_RECEIVED) {
            throw new InvalidStateException("Only PENDING or PAYMENT_RECEIVED orders can be processed. Status: " + order.getStatus());
        }
        
        order.setStatus(OrderStatus.PROCESSING);
        
        Order saved = orderRepository.save(order);
        log.info("Order {} is now being processed", order.getOrderNumber());

        platformLogService.info(LogCategory.ORDER, "ORDER_PROCESSING",
                userId, order.getProduct().getBrand().getUser().getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + order.getOrderNumber());

        return mapToResponse(saved);
    }

    /**
     * Brand ships the order and provides tracking info
     */
    @Transactional
    public OrderResponse shipOrder(Long userId, Long orderId, UpdateShippingRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        verifyBrandOwnerForOrder(userId, order);
        
        if (order.getStatus() == OrderStatus.PAYMENT_RECEIVED) {
            order.setStatus(OrderStatus.PROCESSING);
        }

        if (order.getStatus() != OrderStatus.PROCESSING) {
            throw new InvalidStateException(
                    "Only PAYMENT_RECEIVED or PROCESSING orders can be shipped. Status: " + order.getStatus());
        }
        
        order.setTrackingNumber(request.getTrackingNumber());
        order.setShippedAt(LocalDateTime.now());
        order.setStatus(OrderStatus.SHIPPED);
        
        Order saved = orderRepository.save(order);
        log.info("Order {} shipped with tracking: {}", order.getOrderNumber(), request.getTrackingNumber());

        platformLogService.info(LogCategory.ORDER, "ORDER_SHIPPED",
                userId, order.getProduct().getBrand().getUser().getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + order.getOrderNumber() + " | Tracking: " + request.getTrackingNumber());

        return mapToResponse(saved);
    }

    /**
     * Creator demo flow: mark a shipped order as arrived to buyer destination.
     * SHIPPED -> DELIVERED (waiting for QR claim).
     */
    @Transactional
    public OrderResponse markArrivedDemo(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        verifyBrandOwnerForOrder(userId, order);

        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new InvalidStateException(
                    "Only SHIPPED orders can be marked arrived. Status: " + order.getStatus());
        }

        order.setDeliveredAt(LocalDateTime.now());
        order.setStatus(OrderStatus.DELIVERED);

        Order saved = orderRepository.save(order);
        log.info("Order {} marked as arrived (demo)", order.getOrderNumber());

        platformLogService.info(LogCategory.ORDER, "ORDER_ARRIVED_DEMO",
                userId, order.getProduct().getBrand().getUser().getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + order.getOrderNumber());

        return mapToResponse(saved);
    }
    
    /**
     * Confirm delivery (buyer or system)
     */
    @Transactional
    public OrderResponse confirmDelivery(Long buyerId, Long orderId) {
        Order order = orderRepository.findByIdAndBuyerId(orderId, buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new InvalidStateException("Only SHIPPED orders can be confirmed as delivered. Status: " + order.getStatus());
        }
        
        order.setDeliveredAt(LocalDateTime.now());
        order.setStatus(OrderStatus.DELIVERED);
        
        Order saved = orderRepository.save(order);
        log.info("Order {} delivery confirmed by buyer", order.getOrderNumber());
        
        return mapToResponse(saved);
    }
    
    /**
     * Complete the order manually — fallback for when the buyer does not scan the QR code.
     * Accepts SHIPPED or DELIVERED. The preferred path is buyer scanning the QR label.
     */
    @Transactional
    public OrderResponse completeOrder(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        verifyBrandOwnerForOrder(userId, order);
        
        if (order.getStatus() != OrderStatus.SHIPPED && order.getStatus() != OrderStatus.DELIVERED) {
            throw new InvalidStateException(
                    "Order must be SHIPPED or DELIVERED to complete manually. Status: " + order.getStatus());
        }
        
        // Transfer the seal to buyer
        ProductItem item = order.getProductItem();
        if (item != null) {
            item.setSealStatus(SealStatus.REALIZED);
            item.setCurrentOwnerWallet(order.getBuyerWallet());
            item.setCurrentOwner(order.getBuyer());
            item.setSoldAt(LocalDateTime.now());
            productItemRepository.save(item);
            
            // Record ownership history
            OwnershipHistory history = OwnershipHistory.builder()
                    .productItem(item)
                    .fromWallet(order.getProduct().getBrand().getCompanyWalletAddress())
                    .toWallet(order.getBuyerWallet())
                    .transferType(TransferType.PURCHASE)
                    .notes("Order " + order.getOrderNumber())
                    .transferredAt(LocalDateTime.now())
                    .build();
            ownershipHistoryRepository.save(history);
        }
        
        order.setCompletedAt(LocalDateTime.now());
        order.setStatus(OrderStatus.COMPLETED);
        
        // Trigger blockchain transfer (NFT from brand → buyer)
        if (item != null && item.getTokenId() != null && blockchainService.isAvailable()) {
            try {
                String txHash = blockchainService.transferToken(
                        item.getTokenId(), order.getBuyerWallet(), "PURCHASE");
                if (txHash != null) {
                    order.setSealTransferTxHash(txHash);
                    item.setTransferTxHash(txHash);
                    productItemRepository.save(item);
                    log.info("Blockchain seal transfer successful. TxHash: {}", txHash);
                }
            } catch (Exception e) {
                log.error("Blockchain transfer failed for order {}: {}", order.getOrderNumber(), e.getMessage());
                platformLogService.error(LogCategory.BLOCKCHAIN, "NFT_TRANSFER_FAILED",
                        userId, order.getProduct().getBrand().getUser().getEmail(),
                        "ORDER", order.getId().toString(),
                        "Order: " + order.getOrderNumber(),
                        e.getClass().getSimpleName() + ": " + e.getMessage());
                // Don't fail the order completion — ownership transferred off-chain
            }
        }

        Order saved = orderRepository.save(order);
        log.info("Order {} completed. Seal transferred to buyer wallet: {}",
                order.getOrderNumber(), order.getBuyerWallet());

        platformLogService.info(LogCategory.ORDER, "ORDER_COMPLETED",
                userId, order.getProduct().getBrand().getUser().getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + order.getOrderNumber()
                + " | Buyer wallet: " + order.getBuyerWallet()
                + (order.getSealTransferTxHash() != null ? " | TxHash: " + order.getSealTransferTxHash() : ""));
        
        // Check if all items are sold → update product status
        checkProductCompletion(order.getProduct());
        
        return mapToResponse(saved);
    }
    
    /**
     * Cancel an order (buyer can cancel PENDING orders, brand can cancel PENDING/PAYMENT_RECEIVED)
     */
    @Transactional
    public OrderResponse cancelOrder(Long userId, Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        boolean isBuyer = order.getBuyer().getId().equals(userId);
        boolean isBrandOwner = order.getProduct().getBrand().getUser().getId().equals(userId);
        
        if (!isBuyer && !isBrandOwner) {
            throw new UnauthorizedException("You are not authorized to cancel this order");
        }
        
        if (isBuyer && order.getStatus() != OrderStatus.PENDING) {
            throw new InvalidStateException("Buyers can only cancel PENDING orders. Status: " + order.getStatus());
        }
        
        if (!isBuyer && order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.PAYMENT_RECEIVED) {
            throw new InvalidStateException("Brands can only cancel PENDING or PAYMENT_RECEIVED orders. Status: " + order.getStatus());
        }
        
        // Release the reserved item back
        ProductItem item = order.getProductItem();
        if (item != null && item.getSealStatus() == SealStatus.RESERVED) {
            item.setSealStatus(SealStatus.PRE_MINTED);
            productItemRepository.save(item);

            // Availability is derived from PRE_MINTED item count
            Product product = order.getProduct();
            if (product.getStatus() == ProductStatus.SOLD_OUT) {
                product.setStatus(ProductStatus.LISTED);
            }
            productRepository.save(product);
        }
        
        order.setCancelledAt(LocalDateTime.now());
        order.setCancellationReason(reason);
        order.setStatus(OrderStatus.CANCELLED);
        
        Order saved = orderRepository.save(order);
        log.info("Order {} cancelled by user ID: {}. Reason: {}", order.getOrderNumber(), userId, reason);

        platformLogService.warn(LogCategory.ORDER, "ORDER_CANCELLED",
                userId, order.getBuyer().getEmail(),
                "ORDER", saved.getId().toString(),
                "Order: " + order.getOrderNumber() + " | Reason: " + reason);

        return mapToResponse(saved);
    }
    
    /**
     * Get order by ID (buyer sees their own orders)
     */
    public OrderResponse getOrder(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        boolean isBuyer = order.getBuyer().getId().equals(userId);
        boolean isBrandOwner = order.getProduct().getBrand().getUser().getId().equals(userId);
        
        if (!isBuyer && !isBrandOwner) {
            throw new UnauthorizedException("You are not authorized to view this order");
        }
        
        return mapToResponse(order);
    }
    
    /**
     * Get all orders for a buyer (paginated)
     */
    public Page<OrderResponse> getMyOrders(Long buyerId, Pageable pageable) {
        return orderRepository.findByBuyerId(buyerId, pageable)
                .map(this::mapToResponse);
    }
    
    /**
     * Get all orders for a product (brand owner only, paginated)
     */
    public Page<OrderResponse> getOrdersByProduct(Long userId, String productId, Pageable pageable) {
        Product product = productRepository.findByProductCode(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        if (!product.getBrand().getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You don't own this product's brand");
        }
        
        return orderRepository.findByProductProductCode(productId, pageable)
                .map(this::mapToResponse);
    }
    
    private void verifyBrandOwnerForOrder(Long userId, Order order) {
        if (!order.getProduct().getBrand().getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You don't own this product's brand");
        }
    }

    private void ensureSaleWindowOpen(Product product) {
        LocalDateTime now = LocalDateTime.now();

        if (product.getListingDeadline() != null && !now.isBefore(product.getListingDeadline())) {
            throw new InvalidStateException("This product listing has ended and can no longer be purchased.");
        }

        Collection collection = product.getCollection();
        if (collection != null && collection.getSalesEndAt() != null && !now.isBefore(collection.getSalesEndAt())) {
            throw new InvalidStateException("This collection sale period has ended and can no longer be purchased.");
        }
    }

    private OrderFeeBreakdown calculateOrderFeeBreakdown(Product product) {
        BigDecimal unitPrice = product.getPrice();
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidStateException("Product price must be greater than zero");
        }

        BigDecimal platformFee = unitPrice.multiply(PLATFORM_FEE_RATE)
                .setScale(POL_DECIMAL_SCALE, RoundingMode.HALF_UP);

        BigInteger gasPriceWei = BigInteger.ZERO;
        if (blockchainService.isAvailable()) {
            gasPriceWei = blockchainService.getSuggestedGasPriceWei();
        }

        BigInteger feeWei = gasPriceWei.signum() > 0
                ? gasPriceWei.multiply(SIMPLE_PAYMENT_GAS_LIMIT)
                : BigInteger.ZERO;

        BigDecimal transactionFee = toPol(feeWei)
                .setScale(POL_DECIMAL_SCALE, RoundingMode.HALF_UP);

        BigDecimal totalPrice = unitPrice
                .add(platformFee)
                .add(DELIVERY_FEE)
                .add(transactionFee)
                .setScale(POL_DECIMAL_SCALE, RoundingMode.HALF_UP);

        return new OrderFeeBreakdown(
                unitPrice,
                platformFee,
                DELIVERY_FEE,
                transactionFee,
                totalPrice,
                SIMPLE_PAYMENT_GAS_LIMIT,
                gasPriceWei
        );
    }

    private BigDecimal toPol(BigInteger wei) {
        if (wei == null || wei.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(wei).divide(WEI_PER_POL, POL_DECIMAL_SCALE, RoundingMode.HALF_UP);
    }
    
    private void checkProductCompletion(Product product) {
        long completedOrders = orderRepository.countByProductIdAndStatus(product.getId(), OrderStatus.COMPLETED);
        long totalItems = productItemRepository.countByProductId(product.getId());
        if (totalItems > 0 && completedOrders >= totalItems) {
            product.setStatus(ProductStatus.COMPLETED);
            productRepository.save(product);
            log.info("Product '{}' (ID: {}) is now COMPLETED — all items sold and delivered", 
                    product.getProductName(), product.getId());
        }
    }
    
    private String generateOrderNumber() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "ORD-" + dateStr + "-" + random;
    }

    private String buildUserDisplayName(User user) {
        if (user == null) {
            return null;
        }

        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";

        String fullName = (firstName + " " + lastName).trim();
        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (user.getUserName() != null && !user.getUserName().isBlank()) {
            return user.getUserName();
        }

        return user.getEmail();
    }
    
    private OrderResponse mapToResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
            .productId(order.getProduct().getProductCode())
                .productName(order.getProduct().getProductName())
                .productItemId(order.getProductItem() != null ? order.getProductItem().getId() : null)
                .itemSerial(order.getProductItem() != null ? order.getProductItem().getItemSerial() : null)
                .buyerId(order.getBuyer().getId())
                .buyerUsername(order.getBuyer().getUserName())
                .buyerName(buildUserDisplayName(order.getBuyer()))
                .buyerPhoneNumber(order.getBuyer().getPhoneNumber())
                .brandOwnerUsername(order.getProduct().getBrand().getUser().getUserName())
                .buyerWallet(order.getBuyerWallet())
                .quantity(order.getQuantity())
                .unitPrice(order.getUnitPrice())
                .totalPrice(order.getTotalPrice())
                .paymentTxHash(order.getPaymentTxHash())
                .status(order.getStatus())
                .shippingAddress(order.getShippingAddress())
                .trackingNumber(order.getTrackingNumber())
                .sealTransferTxHash(order.getSealTransferTxHash())
                .createdAt(order.getCreatedAt())
                .paymentConfirmedAt(order.getPaymentConfirmedAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .completedAt(order.getCompletedAt())
                .cancelledAt(order.getCancelledAt())
                .cancellationReason(order.getCancellationReason())
                .build();
    }

    private record OrderFeeBreakdown(
            BigDecimal unitPrice,
            BigDecimal platformFee,
            BigDecimal deliveryFee,
            BigDecimal transactionFee,
            BigDecimal totalPrice,
            BigInteger estimatedGasLimit,
            BigInteger estimatedGasPriceWei
    ) {}
}
