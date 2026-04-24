package com.digitalseal.controller;

import com.digitalseal.dto.request.CreateTransferRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.TransferRecipientResponse;
import com.digitalseal.dto.response.TransferRequestResponse;
import com.digitalseal.service.TransferRequestService;
import com.digitalseal.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/transfers")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Transfer", description = "Ownership transfer request and approval endpoints")
public class TransferController {

    private final TransferRequestService transferRequestService;
    private final UserService userService;

    @Operation(summary = "Get transfer recipient users", description = "Returns active users (excluding current user) with connected wallets.")
    @GetMapping("/recipients")
    public ResponseEntity<ApiResponse<List<TransferRecipientResponse>>> getTransferRecipients(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        List<TransferRecipientResponse> response = userService.getTransferRecipients(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Transfer recipients retrieved"));
    }

    @Operation(summary = "Create transfer request", description = "Current owner sends a transfer request to a registered recipient wallet.")
    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> createTransferRequest(
            Authentication authentication,
            @Valid @RequestBody CreateTransferRequest request
    ) {
        Long userId = Long.parseLong(authentication.getName());
        TransferRequestResponse response = transferRequestService.createTransferRequest(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Transfer request created"));
    }

    @Operation(summary = "Get incoming transfer requests", description = "Returns pending transfer requests where current user is the recipient.")
    @GetMapping("/requests/incoming")
    public ResponseEntity<ApiResponse<List<TransferRequestResponse>>> getIncomingRequests(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        List<TransferRequestResponse> response = transferRequestService.getIncomingPendingRequests(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Incoming transfer requests retrieved"));
    }

    @Operation(summary = "Get outgoing transfer requests", description = "Returns transfer requests created by current user.")
    @GetMapping("/requests/outgoing")
    public ResponseEntity<ApiResponse<List<TransferRequestResponse>>> getOutgoingRequests(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        List<TransferRequestResponse> response = transferRequestService.getOutgoingRequests(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Outgoing transfer requests retrieved"));
    }

    @Operation(summary = "Approve transfer request", description = "Recipient approves pending request. This executes blockchain transfer and updates ownership.")
    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> approveRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        Long userId = Long.parseLong(authentication.getName());
        TransferRequestResponse response = transferRequestService.approveTransferRequest(userId, requestId);
        return ResponseEntity.ok(ApiResponse.success(response, "Transfer request approved and ownership transferred"));
    }

    @Operation(summary = "Reject transfer request", description = "Recipient rejects pending transfer request.")
    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<ApiResponse<TransferRequestResponse>> rejectRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        Long userId = Long.parseLong(authentication.getName());
        TransferRequestResponse response = transferRequestService.rejectTransferRequest(userId, requestId);
        return ResponseEntity.ok(ApiResponse.success(response, "Transfer request rejected"));
    }
}
