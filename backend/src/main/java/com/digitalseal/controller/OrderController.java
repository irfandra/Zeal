package com.digitalseal.controller;

import com.digitalseal.dto.request.ConfirmPaymentRequest;
import com.digitalseal.dto.request.CreateOrderRequest;
import com.digitalseal.dto.request.UpdateShippingRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.OrderFeeEstimateResponse;
import com.digitalseal.dto.response.OrderResponse;
import com.digitalseal.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Order", description = "Order management and fulfillment endpoints")
public class OrderController {
    
    private final OrderService orderService;



    
    @Operation(summary = "Place an order", description = "Create a purchase order for a listed product. Reserves the next available item.")
    @PostMapping("/products/{productId}")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            Authentication authentication,
            @PathVariable String productId,
            @Valid @RequestBody CreateOrderRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.createOrder(userId, productId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Order placed successfully"));
    }

    @Operation(summary = "Estimate order fees", description = "Estimate platform, delivery, and network transaction fees for checkout.")
    @GetMapping("/products/{productId}/fee-estimate")
    public ResponseEntity<ApiResponse<OrderFeeEstimateResponse>> estimateOrderFees(
            Authentication authentication,
            @PathVariable String productId) {
        Long userId = Long.parseLong(authentication.getName());
        OrderFeeEstimateResponse response = orderService.estimateOrderFee(userId, productId);
        return ResponseEntity.ok(ApiResponse.success(response, "Order fee estimate retrieved"));
    }
    
    @Operation(summary = "Confirm payment", description = "Submit blockchain payment transaction hash.")
    @PostMapping("/{orderId}/confirm-payment")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmPayment(
            Authentication authentication,
            @PathVariable Long orderId,
            @Valid @RequestBody ConfirmPaymentRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.confirmPayment(userId, orderId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Payment confirmed"));
    }
    
    @Operation(summary = "Confirm delivery", description = "Buyer confirms they received the physical item.")
    @PostMapping("/{orderId}/confirm-delivery")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmDelivery(
            Authentication authentication,
            @PathVariable Long orderId) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.confirmDelivery(userId, orderId);
        return ResponseEntity.ok(ApiResponse.success(response, "Delivery confirmed"));
    }
    
    @Operation(summary = "Cancel order (buyer)", description = "Cancel a PENDING order.")
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            Authentication authentication,
            @PathVariable Long orderId,
            @Parameter(description = "Cancellation reason") @RequestParam(required = false) String reason) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.cancelOrder(userId, orderId, reason);
        return ResponseEntity.ok(ApiResponse.success(response, "Order cancelled"));
    }
    
    @Operation(summary = "Get my orders", description = "Get all orders for the authenticated buyer.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getMyOrders(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = Long.parseLong(authentication.getName());
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<OrderResponse> orders = orderService.getMyOrders(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(orders, "Orders retrieved"));
    }
    
    @Operation(summary = "Get order by ID", description = "Get details of a specific order.")
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            Authentication authentication,
            @PathVariable Long orderId) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.getOrder(userId, orderId);
        return ResponseEntity.ok(ApiResponse.success(response, "Order retrieved"));
    }



    
    @Operation(summary = "Process order", description = "Brand accepts collector request and begins processing. Supports PENDING (auto payment accept with buyer wallet) or PAYMENT_RECEIVED → PROCESSING.")
    @PostMapping("/{orderId}/process")
    public ResponseEntity<ApiResponse<OrderResponse>> processOrder(
            Authentication authentication,
            @PathVariable Long orderId) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.processOrder(userId, orderId);
        return ResponseEntity.ok(ApiResponse.success(response, "Order is being processed"));
    }
    
    @Operation(summary = "Ship order", description = "Brand ships the order with tracking info. PROCESSING → SHIPPED.")
    @PostMapping("/{orderId}/ship")
    public ResponseEntity<ApiResponse<OrderResponse>> shipOrder(
            Authentication authentication,
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateShippingRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.shipOrder(userId, orderId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Order shipped"));
    }

    @Operation(summary = "Mark order arrived (demo)", description = "Creator demo transition: SHIPPED → DELIVERED (Wait for Claim).")
    @PostMapping("/{orderId}/arrive-demo")
    public ResponseEntity<ApiResponse<OrderResponse>> markOrderArrivedDemo(
            Authentication authentication,
            @PathVariable Long orderId) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.markArrivedDemo(userId, orderId);
        return ResponseEntity.ok(ApiResponse.success(response, "Order marked as arrived"));
    }
    
    @Operation(summary = "Complete order (manual fallback)",
            description = "Manually complete a SHIPPED or DELIVERED order and transfer the NFT seal to the buyer. " +
                    "This is a fallback for when the buyer does not scan the QR code. " +
                    "Preferred path: buyer scans QR label on physical box → NFT auto-transfers and order auto-completes.")
    @PostMapping("/{orderId}/complete")
    public ResponseEntity<ApiResponse<OrderResponse>> completeOrder(
            Authentication authentication,
            @PathVariable Long orderId) {
        Long userId = Long.parseLong(authentication.getName());
        OrderResponse response = orderService.completeOrder(userId, orderId);
        return ResponseEntity.ok(ApiResponse.success(response, "Order completed, seal transferred"));
    }
    
    @Operation(summary = "Get orders for a product", description = "Brand owner views all orders for their product.")
    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getOrdersByProduct(
            Authentication authentication,
            @PathVariable String productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = Long.parseLong(authentication.getName());
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<OrderResponse> orders = orderService.getOrdersByProduct(userId, productId, pageable);
        return ResponseEntity.ok(ApiResponse.success(orders, "Product orders retrieved"));
    }
}
