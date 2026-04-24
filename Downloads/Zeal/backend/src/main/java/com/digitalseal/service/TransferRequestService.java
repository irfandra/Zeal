package com.digitalseal.service;

import com.digitalseal.dto.request.CreateTransferRequest;
import com.digitalseal.dto.response.TransferRequestResponse;
import com.digitalseal.exception.InvalidStateException;
import com.digitalseal.exception.ResourceNotFoundException;
import com.digitalseal.exception.UnauthorizedException;
import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.OwnershipHistory;
import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.model.entity.TransferRequest;
import com.digitalseal.model.entity.TransferRequestStatus;
import com.digitalseal.model.entity.TransferType;
import com.digitalseal.model.entity.User;
import com.digitalseal.repository.OwnershipHistoryRepository;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.TransferRequestRepository;
import com.digitalseal.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class TransferRequestService {

    private final TransferRequestRepository transferRequestRepository;
    private final ProductItemRepository productItemRepository;
    private final UserRepository userRepository;
    private final OwnershipHistoryRepository ownershipHistoryRepository;
    private final BlockchainService blockchainService;
    private final PlatformLogService platformLogService;

    @Transactional
    public TransferRequestResponse createTransferRequest(Long requesterUserId, CreateTransferRequest request) {
        User requester = userRepository.findById(requesterUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Requester user not found"));

        ProductItem item = productItemRepository.findById(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Product item not found"));

        String requesterWallet = normalizeWallet(requester.getWalletAddress());
        if (requesterWallet.isBlank()) {
            throw new InvalidStateException("Connect your wallet before creating transfer requests");
        }

        if (!isCurrentOwner(item, requester.getId(), requesterWallet)) {
            throw new UnauthorizedException("Only current owner can create transfer requests");
        }

        if (item.getSealStatus() != SealStatus.REALIZED) {
            throw new InvalidStateException("Only REALIZED items can be transferred");
        }

        if (item.getTokenId() == null) {
            throw new InvalidStateException("This item has no token ID and cannot be transferred on blockchain");
        }

        String recipientWallet = normalizeWallet(request.getRecipientWallet());
        if (recipientWallet.isBlank()) {
            throw new InvalidStateException("Recipient wallet is required");
        }

        if (recipientWallet.equals(requesterWallet)) {
            throw new InvalidStateException("Recipient wallet cannot be the same as sender wallet");
        }

        User recipient = userRepository.findByWalletAddressIgnoreCase(recipientWallet)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Recipient wallet is not registered to a user account"
                ));

        if (Objects.equals(recipient.getId(), requester.getId())) {
            throw new InvalidStateException("Cannot send transfer request to yourself");
        }

        if (Boolean.FALSE.equals(recipient.getIsActive())) {
            throw new InvalidStateException("Recipient account is inactive");
        }

        boolean duplicatePending = transferRequestRepository.existsByProductItemIdAndToUserIdAndStatus(
                item.getId(), recipient.getId(), TransferRequestStatus.PENDING
        );
        if (duplicatePending) {
            throw new InvalidStateException("A pending transfer request to this recipient already exists for this item");
        }

        String fromWallet = normalizeWallet(item.getCurrentOwnerWallet());
        if (fromWallet.isBlank()) {
            fromWallet = requesterWallet;
        }

        TransferRequest transferRequest = TransferRequest.builder()
                .productItem(item)
                .fromUser(requester)
                .toUser(recipient)
                .fromWallet(fromWallet)
                .toWallet(recipientWallet)
                .status(TransferRequestStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();

        TransferRequest saved = transferRequestRepository.save(transferRequest);

        platformLogService.info(
                LogCategory.USER,
                "TRANSFER_REQUEST_CREATED",
                requester.getId(),
                requester.getEmail(),
                "PRODUCT_ITEM",
                item.getId().toString(),
                "From wallet: " + fromWallet + " | To wallet: " + recipientWallet
        );

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TransferRequestResponse> getIncomingPendingRequests(Long recipientUserId) {
        return transferRequestRepository
                .findIncomingByUserIdAndStatus(recipientUserId, TransferRequestStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransferRequestResponse> getOutgoingRequests(Long requesterUserId) {
        return transferRequestRepository
                .findOutgoingByUserId(requesterUserId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public TransferRequestResponse approveTransferRequest(Long recipientUserId, Long requestId) {
        TransferRequest transferRequest = transferRequestRepository.findByIdWithDetails(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer request not found"));

        if (!Objects.equals(transferRequest.getToUser().getId(), recipientUserId)) {
            throw new UnauthorizedException("Only recipient can approve this transfer request");
        }

        if (transferRequest.getStatus() != TransferRequestStatus.PENDING) {
            throw new InvalidStateException("Only pending transfer requests can be approved");
        }

        ProductItem item = productItemRepository.findByIdForUpdate(transferRequest.getProductItem().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Product item not found"));

        String requestFromWallet = normalizeWallet(transferRequest.getFromWallet());
        boolean ownerStillMatches = isCurrentOwner(item, transferRequest.getFromUser().getId(), requestFromWallet);
        if (!ownerStillMatches) {
            throw new InvalidStateException("Ownership has changed; this transfer request is stale");
        }

        if (item.getTokenId() == null) {
            throw new InvalidStateException("This item has no token ID and cannot be transferred on blockchain");
        }

        if (!blockchainService.isAvailable()) {
            throw new InvalidStateException("Blockchain service is unavailable. Try again later");
        }

        String recipientWallet = normalizeWallet(transferRequest.getToWallet());
        if (recipientWallet.isBlank()) {
            throw new InvalidStateException("Recipient wallet is missing on transfer request");
        }

        String txHash;
        try {
            txHash = blockchainService.transferToken(item.getTokenId(), recipientWallet, "TRANSFER");
        } catch (Exception ex) {
            log.error("Blockchain transfer failed for request {}: {}", requestId, ex.getMessage(), ex);
            throw new InvalidStateException("Blockchain transfer failed. Please try again");
        }

        if (txHash == null || txHash.isBlank()) {
            throw new InvalidStateException("Blockchain transfer failed. No transaction hash returned");
        }

        LocalDateTime now = LocalDateTime.now();
        String fromWallet = normalizeWallet(item.getCurrentOwnerWallet());
        if (fromWallet.isBlank()) {
            fromWallet = requestFromWallet;
        }

        item.setCurrentOwner(transferRequest.getToUser());
        item.setCurrentOwnerWallet(recipientWallet);
        item.setSealStatus(SealStatus.REALIZED);
        item.setTransferTxHash(txHash);
        productItemRepository.save(item);

        OwnershipHistory history = OwnershipHistory.builder()
                .productItem(item)
                .fromWallet(fromWallet)
                .toWallet(recipientWallet)
                .transferType(TransferType.TRANSFER)
                .txHash(txHash)
                .notes("Recipient-approved transfer request #" + transferRequest.getId())
                .transferredAt(now)
                .build();
        ownershipHistoryRepository.save(history);

        transferRequest.setStatus(TransferRequestStatus.APPROVED);
        transferRequest.setRespondedAt(now);
        transferRequest.setTransferTxHash(txHash);
        transferRequestRepository.save(transferRequest);

        List<TransferRequest> otherPending = transferRequestRepository
                .findByProductItemIdAndStatus(item.getId(), TransferRequestStatus.PENDING);
        List<TransferRequest> stalePending = otherPending.stream()
                .filter(other -> !Objects.equals(other.getId(), transferRequest.getId()))
                .toList();

        stalePending.forEach(other -> {
            other.setStatus(TransferRequestStatus.REJECTED);
            other.setRespondedAt(now);
        });
        if (!stalePending.isEmpty()) {
            transferRequestRepository.saveAll(stalePending);
        }

        platformLogService.info(
                LogCategory.BLOCKCHAIN,
                "TRANSFER_REQUEST_APPROVED",
                transferRequest.getToUser().getId(),
                transferRequest.getToUser().getEmail(),
                "PRODUCT_ITEM",
                item.getId().toString(),
                "TxHash: " + txHash
        );

        return mapToResponse(transferRequest);
    }

    @Transactional
    public TransferRequestResponse rejectTransferRequest(Long recipientUserId, Long requestId) {
        TransferRequest transferRequest = transferRequestRepository.findByIdWithDetails(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer request not found"));

        if (!Objects.equals(transferRequest.getToUser().getId(), recipientUserId)) {
            throw new UnauthorizedException("Only recipient can reject this transfer request");
        }

        if (transferRequest.getStatus() != TransferRequestStatus.PENDING) {
            throw new InvalidStateException("Only pending transfer requests can be rejected");
        }

        transferRequest.setStatus(TransferRequestStatus.REJECTED);
        transferRequest.setRespondedAt(LocalDateTime.now());

        TransferRequest saved = transferRequestRepository.save(transferRequest);

        platformLogService.info(
                LogCategory.USER,
                "TRANSFER_REQUEST_REJECTED",
                transferRequest.getToUser().getId(),
                transferRequest.getToUser().getEmail(),
                "PRODUCT_ITEM",
                transferRequest.getProductItem().getId().toString(),
                "Request ID: " + transferRequest.getId()
        );

        return mapToResponse(saved);
    }

    private TransferRequestResponse mapToResponse(TransferRequest request) {
        ProductItem item = request.getProductItem();

        return TransferRequestResponse.builder()
                .id(request.getId())
                .itemId(item.getId())
                .itemSerial(item.getItemSerial())
                .productName(item.getProduct().getProductName())
                .brandName(item.getProduct().getBrand().getBrandName())
            .productImageUrl(safeTrim(item.getProduct().getImageUrl()))
            .brandLogoUrl(safeTrim(item.getProduct().getBrand().getLogo()))
                .tokenId(item.getTokenId())
                .nftQrCode(item.getNftQrCode())
                .productLabelQrCode(item.getProductLabelQrCode())
                .certificateQrCode(item.getCertificateQrCode())
                .fromUserId(request.getFromUser().getId())
                .fromUserName(request.getFromUser().getUserName())
                .fromWallet(request.getFromWallet())
                .toUserId(request.getToUser().getId())
                .toUserName(request.getToUser().getUserName())
                .toWallet(request.getToWallet())
                .status(request.getStatus())
                .requestedAt(request.getRequestedAt())
                .respondedAt(request.getRespondedAt())
                .transferTxHash(request.getTransferTxHash())
                .build();
    }

    private boolean isCurrentOwner(ProductItem item, Long userId, String walletAddress) {
        Long currentOwnerId = item.getCurrentOwner() != null ? item.getCurrentOwner().getId() : null;
        String currentOwnerWallet = normalizeWallet(item.getCurrentOwnerWallet());

        boolean matchesByUserId = currentOwnerId != null && Objects.equals(currentOwnerId, userId);
        boolean matchesByWallet = !walletAddress.isBlank() && walletAddress.equals(currentOwnerWallet);

        return matchesByUserId || matchesByWallet;
    }

    private String normalizeWallet(String wallet) {
        return String.valueOf(wallet == null ? "" : wallet).trim().toLowerCase();
    }

    private String safeTrim(String value) {
        return String.valueOf(value == null ? "" : value).trim();
    }
}
