package com.digitalseal.controller;

import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.service.BlockchainService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/blockchain")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Blockchain", description = "Blockchain interaction endpoints")
public class BlockchainController {

    private final BlockchainService blockchainService;

    @Operation(summary = "Check blockchain status", description = "Check if the blockchain node is connected and contract is deployed")
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        Map<String, Object> status = Map.of(
            "available", blockchainService.isAvailable(),
            "message", blockchainService.isAvailable() ? 
                "Blockchain connected and contract deployed" : 
                "Blockchain not available. Check node connection and contract address."
        );
        return ResponseEntity.ok(ApiResponse.success(status, "Blockchain status"));
    }

    @Operation(summary = "Verify token on-chain", description = "Query the smart contract directly to verify an NFT token")
    @GetMapping("/verify/{tokenId}")
    public ResponseEntity<ApiResponse<BlockchainService.VerifyResult>> verifyOnChain(
            @PathVariable Long tokenId) {
        BlockchainService.VerifyResult result = blockchainService.verify(tokenId);
        if (result == null) {
            return ResponseEntity.ok(ApiResponse.error("BLOCKCHAIN_UNAVAILABLE", "Blockchain verification unavailable"));
        }
        String message = result.exists() ? "Token verified on blockchain" : "Token not found on blockchain";
        return ResponseEntity.ok(ApiResponse.success(result, message));
    }

    @Operation(summary = "Authorize a brand wallet", description = "Authorize a brand wallet address to premint NFTs (admin only)")
    @PostMapping("/authorize-brand")
    public ResponseEntity<ApiResponse<Map<String, String>>> authorizeBrand(
            @RequestParam String walletAddress,
            @RequestParam(defaultValue = "true") boolean authorized) {
        String txHash = blockchainService.authorizeBrand(walletAddress, authorized);
        if (txHash == null) {
            return ResponseEntity.ok(ApiResponse.error("BLOCKCHAIN_UNAVAILABLE", "Blockchain not available"));
        }
        Map<String, String> result = Map.of(
            "walletAddress", walletAddress,
            "authorized", String.valueOf(authorized),
            "txHash", txHash
        );
        return ResponseEntity.ok(ApiResponse.success(result, "Brand wallet authorization updated on blockchain"));
    }
}
