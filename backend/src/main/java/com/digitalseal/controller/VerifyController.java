package com.digitalseal.controller;

import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.OwnershipHistoryResponse;
import com.digitalseal.dto.response.VerificationResponse;
import com.digitalseal.service.ProductItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/verify")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "Verification", description = "Public product authenticity verification endpoints")
public class VerifyController {
    
    private final ProductItemService productItemService;
    
    @Operation(summary = "Verify item by ID", description = "Verify a product item's digital seal authenticity by item ID. Returns full provenance chain.")
    @GetMapping("/item/{itemId}")
    public ResponseEntity<ApiResponse<VerificationResponse>> verifyItem(@PathVariable Long itemId) {
        VerificationResponse response = productItemService.verifyItem(itemId);
        return ResponseEntity.ok(ApiResponse.success(response, 
                response.getAuthentic() ? "Item is authentic" : "Item authenticity could not be verified"));
    }
    
    @Operation(summary = "Verify item by serial", description = "Verify a product item by its serial number.")
    @GetMapping("/serial/{serial}")
    public ResponseEntity<ApiResponse<VerificationResponse>> verifyBySerial(@PathVariable String serial) {
        VerificationResponse response = productItemService.verifyItemBySerial(serial);
        return ResponseEntity.ok(ApiResponse.success(response,
                response.getAuthentic() ? "Item is authentic" : "Item authenticity could not be verified"));
    }
    
    @Operation(summary = "Get ownership history", description = "Get the full ownership/transfer history of a product item.")
    @GetMapping("/item/{itemId}/history")
    public ResponseEntity<ApiResponse<List<OwnershipHistoryResponse>>> getOwnershipHistory(@PathVariable Long itemId) {
        List<OwnershipHistoryResponse> history = productItemService.getOwnershipHistory(itemId);
        return ResponseEntity.ok(ApiResponse.success(history, "Ownership history retrieved"));
    }
}
