package com.digitalseal.service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.digitalseal.model.entity.LogCategory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthGetCode;
import org.web3j.protocol.core.methods.response.EthEstimateGas;
import org.web3j.protocol.core.methods.response.EthGetTransactionReceipt;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.EthTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.utils.Numeric;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@SuppressWarnings("rawtypes")
public class BlockchainService {

    private static final String BURN_WALLET = "0x000000000000000000000000000000000000dEaD";
    private static final BigInteger FALLBACK_GAS_PRICE_WEI = BigInteger.valueOf(30_000_000_000L);
    private static final BigInteger GAS_PRICE_MULTIPLIER_NUMERATOR = BigInteger.valueOf(12);
    private static final BigInteger GAS_PRICE_MULTIPLIER_DENOMINATOR = BigInteger.TEN;
    private static final BigInteger FALLBACK_BATCH_PREMINT_GAS_LIMIT = BigInteger.valueOf(5_000_000L);
    private static final BigInteger MAX_BATCH_PREMINT_GAS_LIMIT = BigInteger.valueOf(25_000_000L);
    private static final BigInteger BATCH_PREMINT_GAS_BUFFER_NUMERATOR = BigInteger.valueOf(12);
    private static final BigInteger BATCH_PREMINT_GAS_BUFFER_DENOMINATOR = BigInteger.TEN;
    private static final BigDecimal WEI_PER_GWEI = new BigDecimal("1000000000");
    private static final BigDecimal WEI_PER_POL = new BigDecimal("1000000000000000000");

    public record BatchMintResult(String txHash, BigInteger blockNumber, BigInteger startTokenId) {}
    public record BatchMintFeeEstimate(BigInteger gasLimit, BigInteger gasPriceWei, BigInteger feeWei, String payerWallet) {}
    public record VerifyResult(
        boolean exists, String serial, String brand, String currentOwner,
        boolean isSold, boolean isClaimed, long mintedAt, String metadataURI
    ) {}
    private final Web3j web3j;

    private final Credentials credentials;

    private final ContractGasProvider gasProvider;

    private final PlatformLogService platformLogService;

    @Value("${web3.contract.address:}")
    private String contractAddress;

    @Value("${web3.rpc.url:}")
    private String rpcUrl;

    @Value("${WEB3_CHAIN_ID:${POLYGON_LIKE_CHAIN_ID:80002}}")
    private long chainId;

    @Value("${web3.brand.private-keys:}")
    private String brandPrivateKeysConfig;

    private boolean blockchainAvailable = false;
    private final Map<String, Credentials> brandMintSignerCredentials = new HashMap<>();

    public BlockchainService(Web3j web3j, Credentials credentials, ContractGasProvider gasProvider,
                             PlatformLogService platformLogService) {
        this.web3j = web3j;
        this.credentials = credentials;
        this.gasProvider = gasProvider;
        this.platformLogService = platformLogService;
    }


    @PostConstruct
    public void init() {
        initializeBrandMintSigners();

        try {
            if (contractAddress != null && !contractAddress.isBlank()) {
                web3j.web3ClientVersion().send();
                blockchainAvailable = true;
                log.info("Blockchain service initialized. Contract: {}", contractAddress);
            } else {
                log.warn("No contract address configured. Blockchain features disabled.");
            }
        } catch (Exception e) {
            log.warn("Blockchain node not available: {}. Blockchain features disabled.", e.getMessage());
        }
    }



    public boolean isAvailable() {
        return blockchainAvailable;
    }

    
    public BigInteger getSuggestedGasPriceWei() {
        return resolveGasPrice("nativeTransferEstimate");
    }

    
    public String getCustodyWalletAddress() {
        try {
            return credentials != null ? credentials.getAddress() : null;
        } catch (Exception e) {
            log.warn("Unable to resolve custody wallet address: {}", e.getMessage());
            return null;
        }
    }


    
    public BatchMintResult batchPreMint(String brandWallet, List<String> serials, List<String> metadataURIs, BigInteger priceWei) {
        if (!blockchainAvailable) {
            log.warn("Blockchain not available. Skipping batch premint.");
            return null;
        }

        final String operation = "batchPreMint";
        String txContext = "brandWallet=" + brandWallet + " items=" + serials.size() + " priceWei=" + priceWei;

        try {
            log.info("Batch pre-minting {} items for brand wallet: {}", serials.size(), brandWallet);
            ensureContractCodeExists(operation);

            Credentials mintSigner = resolveMintSignerCredentials(brandWallet);
            txContext = txContext + " payerWallet=" + mintSigner.getAddress();


            List<Type> inputParameters = Arrays.asList(
                new Address(brandWallet),
                new DynamicArray<>(Utf8String.class, serials.stream().map(Utf8String::new).toList()),
                new DynamicArray<>(Utf8String.class, metadataURIs.stream().map(Utf8String::new).toList()),
                new Uint256(priceWei)
            );

            List<TypeReference<?>> outputParameters = Collections.singletonList(
                new TypeReference<Uint256>() {}
            );

            Function function = new Function("batchPreMint", inputParameters, outputParameters);
            String encodedFunction = FunctionEncoder.encode(function);


            BigInteger totalSupplyBefore = getTotalSupply();
            log.info("totalSupply before mint: {}", totalSupplyBefore);
            BigInteger gasLimit = resolveBatchPreMintGasLimit(encodedFunction, txContext, mintSigner.getAddress());

            TransactionManager txManager = new RawTransactionManager(web3j, mintSigner, chainId);
            BigInteger submittedGasPriceWei = resolveGasPrice(operation);

            EthSendTransaction txResponse = txManager.sendTransaction(
                submittedGasPriceWei,
                gasLimit,
                contractAddress,
                encodedFunction,
                BigInteger.ZERO
            );

            if (txResponse.hasError()) {
                platformLogService.error(
                    LogCategory.BLOCKCHAIN,
                    "BLOCKCHAIN_TX_SEND_FAILED",
                    null,
                    null,
                    "TX",
                    operation,
                    txContext,
                    txResponse.getError().getMessage()
                );
                log.error("Batch premint tx failed: {}", txResponse.getError().getMessage());
                throw new RuntimeException("Blockchain transaction failed: " + txResponse.getError().getMessage());
            }

            String txHash = txResponse.getTransactionHash();
            log.info("Batch premint tx sent: {}", txHash);
            logTransactionSubmitted(operation, txHash, submittedGasPriceWei, mintSigner.getAddress(), contractAddress, txContext);

            EthGetTransactionReceipt receiptResponse = web3j.ethGetTransactionReceipt(txHash).send();
            TransactionReceipt receipt = receiptResponse.getTransactionReceipt().orElse(null);

            int attempts = 0;
            while (receipt == null && attempts < 30) {
                Thread.sleep(1000);
                receiptResponse = web3j.ethGetTransactionReceipt(txHash).send();
                receipt = receiptResponse.getTransactionReceipt().orElse(null);
                attempts++;
            }

            if (receipt == null) {
                log.warn("Transaction receipt not available after 30s. TxHash: {}", txHash);
                platformLogService.warn(
                    LogCategory.BLOCKCHAIN,
                    "BLOCKCHAIN_TX_RECEIPT_TIMEOUT",
                    null,
                    null,
                    "TX",
                    txHash,
                    "operation=" + operation + " " + txContext
                );
                return new BatchMintResult(txHash, null, totalSupplyBefore);
            }

            if (!receipt.isStatusOK()) {
                String revertMessage = buildBatchPreMintRevertMessage(receipt, gasLimit, serials.size());
                platformLogService.error(
                    LogCategory.BLOCKCHAIN,
                    "BLOCKCHAIN_TX_REVERTED",
                    null,
                    null,
                    "TX",
                    txHash,
                    "operation=" + operation + " " + txContext,
                    "status=" + receipt.getStatus() + " gasUsed=" + receipt.getGasUsed() + " gasLimit=" + gasLimit
                );
                log.error("Batch premint tx reverted. TxHash: {}", txHash);
                throw new RuntimeException(revertMessage);
            }

            logTransactionConfirmed(operation, txHash, receipt, submittedGasPriceWei, txContext);

            BigInteger blockNumber = receipt.getBlockNumber();

            BigInteger startTokenId = totalSupplyBefore;

            log.info("Batch premint successful. TxHash: {}, Block: {}, StartTokenId: {}", 
                txHash, blockNumber, startTokenId);

            return new BatchMintResult(txHash, blockNumber, startTokenId);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted during blockchain operation", e);
        } catch (RuntimeException e) {
            platformLogService.error(
                LogCategory.BLOCKCHAIN,
                "BLOCKCHAIN_TX_RUNTIME_ERROR",
                null,
                null,
                "TX",
                operation,
                txContext,
                e.getMessage()
            );
            throw e;
        } catch (Exception e) {
            platformLogService.error(
                LogCategory.BLOCKCHAIN,
                "BLOCKCHAIN_TX_EXCEPTION",
                null,
                null,
                "TX",
                operation,
                txContext,
                e.getMessage()
            );
            log.error("Blockchain batchPreMint error: {}", e.getMessage(), e);
            throw new RuntimeException("Blockchain operation failed", e);
        }
    }

    public BatchMintFeeEstimate estimateBatchPreMintFee(String brandWallet, List<String> serials,
                                                        List<String> metadataURIs, BigInteger priceWei) {
        if (!blockchainAvailable) {
            throw new RuntimeException("Blockchain is unavailable. Unable to estimate minting fee.");
        }

        final String operation = "batchPreMintEstimate";
        String txContext = "brandWallet=" + brandWallet + " items=" + serials.size() + " priceWei=" + priceWei;

        try {
            ensureContractCodeExists(operation);

            Credentials mintSigner = resolveMintSignerCredentials(brandWallet);
            txContext = txContext + " payerWallet=" + mintSigner.getAddress();

            List<Type> inputParameters = Arrays.asList(
                new Address(brandWallet),
                new DynamicArray<>(Utf8String.class, serials.stream().map(Utf8String::new).toList()),
                new DynamicArray<>(Utf8String.class, metadataURIs.stream().map(Utf8String::new).toList()),
                new Uint256(priceWei)
            );

            List<TypeReference<?>> outputParameters = Collections.singletonList(
                new TypeReference<Uint256>() {}
            );

            Function function = new Function("batchPreMint", inputParameters, outputParameters);
            String encodedFunction = FunctionEncoder.encode(function);

            BigInteger estimatedGasLimit = resolveBatchPreMintGasLimit(encodedFunction, txContext, mintSigner.getAddress());
            BigInteger suggestedGasPriceWei = resolveGasPrice(operation);
            BigInteger estimatedFeeWei = estimatedGasLimit.multiply(suggestedGasPriceWei);

            log.info(
                "Estimated batchPreMint fee: payer={} gasLimit={} gasPriceWei={} feeWei={} {}",
                mintSigner.getAddress(),
                estimatedGasLimit,
                suggestedGasPriceWei,
                estimatedFeeWei,
                txContext
            );

            return new BatchMintFeeEstimate(estimatedGasLimit, suggestedGasPriceWei, estimatedFeeWei, mintSigner.getAddress());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Unable to estimate batchPreMint fee: {}", e.getMessage());
            throw new RuntimeException("Unable to estimate batch pre-mint fee", e);
        }
    }


    
    public String transferToken(Long tokenId, String toWallet, String context) {
        if (!blockchainAvailable) {
            log.warn("Blockchain not available. Skipping token transfer.");
            return null;
        }

        final String operation = "transferSeal";
        final String transferReason = context == null || context.isBlank() ? "TRANSFER" : context;
        final String txContext = "tokenId=" + tokenId + " to=" + toWallet + " reason=" + transferReason;

        try {
            log.info("Transferring tokenId={} to {} (context: {})", tokenId, toWallet, context);

            List<Type> inputParameters = Arrays.asList(
                new Uint256(BigInteger.valueOf(tokenId)),
                new Address(toWallet),
                new Utf8String(transferReason)
            );

            Function function = new Function("transferSeal", inputParameters, Collections.emptyList());
            String encodedFunction = FunctionEncoder.encode(function);

            TransactionManager txManager = new RawTransactionManager(web3j, credentials, chainId);
            BigInteger submittedGasPriceWei = resolveGasPrice(operation);

            EthSendTransaction txResponse = txManager.sendTransaction(
                submittedGasPriceWei,
                BigInteger.valueOf(1_000_000),
                contractAddress,
                encodedFunction,
                BigInteger.ZERO
            );

            if (txResponse.hasError()) {
                platformLogService.error(
                    LogCategory.BLOCKCHAIN,
                    "BLOCKCHAIN_TX_SEND_FAILED",
                    null,
                    null,
                    "TX",
                    operation,
                    txContext,
                    txResponse.getError().getMessage()
                );
                throw new RuntimeException("Transfer failed: " + txResponse.getError().getMessage());
            }

            String txHash = txResponse.getTransactionHash();
            log.info("Token transfer tx sent: {}", txHash);
            logTransactionSubmitted(operation, txHash, submittedGasPriceWei, credentials.getAddress(), toWallet, txContext);

            TransactionReceipt receipt = waitForReceipt(txHash);
            logTransactionConfirmed(operation, txHash, receipt, submittedGasPriceWei, txContext);

            return txHash;

        } catch (RuntimeException e) {
            platformLogService.error(
                LogCategory.BLOCKCHAIN,
                "BLOCKCHAIN_TX_RUNTIME_ERROR",
                null,
                null,
                "TX",
                operation,
                txContext,
                e.getMessage()
            );
            throw e;
        } catch (Exception e) {
            platformLogService.error(
                LogCategory.BLOCKCHAIN,
                "BLOCKCHAIN_TX_EXCEPTION",
                null,
                null,
                "TX",
                operation,
                txContext,
                e.getMessage()
            );
            log.error("Blockchain transferToken error: {}", e.getMessage(), e);
            throw new RuntimeException("Blockchain operation failed", e);
        }
    }

    public String burnToken(Long tokenId) {
        if (tokenId == null) {
            return null;
        }
        return transferToken(tokenId, BURN_WALLET, "BURN");
    }


    
    public VerifyResult verify(Long tokenId) {
        if (!blockchainAvailable) {
            return null;
        }

        try {
            List<Type> inputParameters = Collections.singletonList(
                new Uint256(BigInteger.valueOf(tokenId))
            );

            List<TypeReference<?>> outputParameters = Arrays.asList(
                new TypeReference<Bool>() {},
                new TypeReference<Utf8String>() {},
                new TypeReference<Address>() {},
                new TypeReference<Address>() {},
                new TypeReference<Bool>() {},
                new TypeReference<Bool>() {},
                new TypeReference<Uint256>() {},
                new TypeReference<Utf8String>() {}
            );

            Function function = new Function("verify", inputParameters, outputParameters);
            String encodedFunction = FunctionEncoder.encode(function);

            EthCall response = web3j.ethCall(
                Transaction.createEthCallTransaction(
                    credentials.getAddress(),
                    contractAddress,
                    encodedFunction
                ),
                DefaultBlockParameterName.LATEST
            ).send();

            List<Type> results = FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());

            if (results.isEmpty()) {
                return null;
            }

            boolean exists = (Boolean) results.get(0).getValue();
            String serial = (String) results.get(1).getValue();
            String brand = (String) results.get(2).getValue();
            String currentOwner = (String) results.get(3).getValue();
            boolean isSold = (Boolean) results.get(4).getValue();
            boolean isClaimed = (Boolean) results.get(5).getValue();
            BigInteger mintedAt = (BigInteger) results.get(6).getValue();
            String metadataURI = (String) results.get(7).getValue();

            return new VerifyResult(exists, serial, brand, currentOwner, isSold, isClaimed, mintedAt.longValue(), metadataURI);

        } catch (Exception e) {
            log.error("Blockchain verify error: {}", e.getMessage(), e);
            return null;
        }
    }

    public String authorizeBrand(String brandWallet, boolean authorized) {
        if (!blockchainAvailable) {
            return null;
        }

        final String operation = "authorizeBrand";
        final String txContext = "brandWallet=" + brandWallet + " authorized=" + authorized;

        try {
            List<Type> inputParameters = Arrays.asList(
                new Address(brandWallet),
                new Bool(authorized)
            );

            Function function = new Function("authorizeBrand", inputParameters, Collections.emptyList());
            String encodedFunction = FunctionEncoder.encode(function);

            TransactionManager txManager = new RawTransactionManager(web3j, credentials, chainId);
            BigInteger submittedGasPriceWei = resolveGasPrice(operation);

            EthSendTransaction txResponse = txManager.sendTransaction(
                submittedGasPriceWei,
                BigInteger.valueOf(100_000),
                contractAddress,
                encodedFunction,
                BigInteger.ZERO
            );

            if (txResponse.hasError()) {
                platformLogService.error(
                    LogCategory.BLOCKCHAIN,
                    "BLOCKCHAIN_TX_SEND_FAILED",
                    null,
                    null,
                    "TX",
                    operation,
                    txContext,
                    txResponse.getError().getMessage()
                );
                throw new RuntimeException("authorizeBrand failed: " + txResponse.getError().getMessage());
            }

            String txHash = txResponse.getTransactionHash();
            logTransactionSubmitted(operation, txHash, submittedGasPriceWei, credentials.getAddress(), contractAddress, txContext);

            TransactionReceipt receipt = waitForReceipt(txHash);
            logTransactionConfirmed(operation, txHash, receipt, submittedGasPriceWei, txContext);
            log.info("Brand {} authorized={} tx: {}", brandWallet, authorized, txHash);
            return txHash;

        } catch (Exception e) {
            platformLogService.error(
                LogCategory.BLOCKCHAIN,
                "BLOCKCHAIN_TX_EXCEPTION",
                null,
                null,
                "TX",
                operation,
                txContext,
                e.getMessage()
            );
            log.error("Blockchain authorizeBrand error: {}", e.getMessage(), e);
            throw new RuntimeException("Blockchain operation failed", e);
        }
    }


    private BigInteger getTotalSupply() throws Exception {
        ensureContractCodeExists("totalSupply");

        Function function = new Function("totalSupply", Collections.emptyList(),
            Collections.singletonList(new TypeReference<Uint256>() {}));

        String encoded = FunctionEncoder.encode(function);

        EthCall response = web3j.ethCall(
            Transaction.createEthCallTransaction(credentials.getAddress(), contractAddress, encoded),
            DefaultBlockParameterName.LATEST
        ).send();

        String rawValue = response != null ? response.getValue() : null;
        if (rawValue == null || rawValue.isBlank() || "0x".equalsIgnoreCase(rawValue)) {
            throw new RuntimeException(
                "Unable to read totalSupply from blockchain. Empty eth_call response for contract "
                    + safeValue(contractAddress)
                    + " on " + safeValue(rpcUrl)
                    + ". Contract may be missing on current chain state."
            );
        }

        List<Type> results = FunctionReturnDecoder.decode(rawValue, function.getOutputParameters());
        if (results == null || results.isEmpty() || results.get(0) == null || results.get(0).getValue() == null) {
            throw new RuntimeException(
                "Unable to decode totalSupply from contract response for " + safeValue(contractAddress)
                    + ". Ensure CONTRACT_ADDRESS matches the active hardhat chain deployment."
            );
        }

        return (BigInteger) results.get(0).getValue();
    }

    private void ensureContractCodeExists(String operation) throws Exception {
        if (contractAddress == null || contractAddress.isBlank()) {
            throw new RuntimeException("Contract address is empty. Set CONTRACT_ADDRESS before " + operation + ".");
        }

        EthGetCode codeResponse = web3j.ethGetCode(contractAddress, DefaultBlockParameterName.LATEST).send();
        String code = codeResponse != null ? codeResponse.getCode() : null;
        if (code == null || code.isBlank() || "0x".equalsIgnoreCase(code)) {
            throw new RuntimeException(
                "Smart contract code not found at " + contractAddress
                    + " on " + safeValue(rpcUrl)
                    + " while executing " + operation
                    + ". Redeploy contract on the current hardhat state and reload backend."
            );
        }
    }

    private BigInteger resolveBatchPreMintGasLimit(String encodedFunction, String txContext, String fromAddress) {
        try {
            String callerAddress = String.valueOf(fromAddress == null ? "" : fromAddress).trim();
            if (callerAddress.isBlank()) {
                callerAddress = credentials != null ? String.valueOf(credentials.getAddress()).trim() : "";
            }
            if (callerAddress.isBlank()) {
                throw new RuntimeException("Unable to estimate gas because payer wallet address is empty");
            }

            Transaction estimateRequest = Transaction.createFunctionCallTransaction(
                callerAddress,
                null,
                null,
                null,
                contractAddress,
                encodedFunction
            );

            EthEstimateGas estimateResponse = web3j.ethEstimateGas(estimateRequest).send();
            if (estimateResponse.hasError()) {
                String estimateError = estimateResponse.getError().getMessage();
                if (estimateError != null && !estimateError.isBlank()) {
                    throw new RuntimeException("batchPreMint preflight failed: " + estimateError);
                }
                log.warn("Gas estimation for batchPreMint returned error without message. Using fallback gas limit {}.",
                    FALLBACK_BATCH_PREMINT_GAS_LIMIT);
                return FALLBACK_BATCH_PREMINT_GAS_LIMIT;
            }

            BigInteger estimatedGas = estimateResponse.getAmountUsed();
            if (estimatedGas == null || estimatedGas.signum() <= 0) {
                log.warn("Gas estimation for batchPreMint returned invalid value {}. Using fallback gas limit {}.",
                    estimatedGas,
                    FALLBACK_BATCH_PREMINT_GAS_LIMIT);
                return FALLBACK_BATCH_PREMINT_GAS_LIMIT;
            }

            BigInteger bufferedGas = estimatedGas
                .multiply(BATCH_PREMINT_GAS_BUFFER_NUMERATOR)
                .divide(BATCH_PREMINT_GAS_BUFFER_DENOMINATOR);
            BigInteger selectedGas = bufferedGas
                .max(FALLBACK_BATCH_PREMINT_GAS_LIMIT)
                .min(MAX_BATCH_PREMINT_GAS_LIMIT);

            log.info(
                "Resolved batch pre-mint gas limit: estimated={} buffered={} selected={} {}",
                estimatedGas,
                bufferedGas,
                selectedGas,
                txContext
            );

            return selectedGas;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.warn(
                "Unable to estimate gas for batchPreMint. Using fallback gas limit {}: {}",
                FALLBACK_BATCH_PREMINT_GAS_LIMIT,
                e.getMessage()
            );
            return FALLBACK_BATCH_PREMINT_GAS_LIMIT;
        }
    }

    private void initializeBrandMintSigners() {
        brandMintSignerCredentials.clear();

        String rawConfig = String.valueOf(brandPrivateKeysConfig == null ? "" : brandPrivateKeysConfig).trim();
        if (rawConfig.isBlank()) {
            log.info("No brand-specific signer keys configured via WEB3_BRAND_PRIVATE_KEYS");
            return;
        }

        String[] entries = rawConfig.split("[,;\\n]");
        for (String entry : entries) {
            String trimmedEntry = String.valueOf(entry == null ? "" : entry).trim();
            if (trimmedEntry.isBlank()) {
                continue;
            }

            int separatorIndex = trimmedEntry.indexOf(':');
            if (separatorIndex < 0) {
                separatorIndex = trimmedEntry.indexOf('=');
            }

            if (separatorIndex <= 0 || separatorIndex >= trimmedEntry.length() - 1) {
                log.warn("Ignoring invalid WEB3_BRAND_PRIVATE_KEYS entry. Expected wallet:privateKey format.");
                continue;
            }

            String wallet = normalizeWallet(trimmedEntry.substring(0, separatorIndex));
            String privateKey = trimmedEntry.substring(separatorIndex + 1).trim();
            if (wallet.isBlank() || privateKey.isBlank()) {
                log.warn("Ignoring brand signer mapping with empty wallet or private key.");
                continue;
            }

            try {
                Credentials signer = Credentials.create(privateKey);
                String signerWallet = normalizeWallet(signer.getAddress());
                if (!wallet.equals(signerWallet)) {
                    log.warn(
                        "Ignoring brand signer mapping for wallet {} because private key resolves to {}",
                        wallet,
                        signer.getAddress()
                    );
                    continue;
                }

                brandMintSignerCredentials.put(wallet, signer);
            } catch (Exception e) {
                log.warn("Ignoring invalid private key in WEB3_BRAND_PRIVATE_KEYS entry: {}", e.getMessage());
            }
        }

        log.info("Loaded {} brand signer wallet mapping(s) for batch mint payer enforcement", brandMintSignerCredentials.size());
    }

    private Credentials resolveMintSignerCredentials(String brandWallet) {
        String normalizedBrandWallet = normalizeWallet(brandWallet);
        if (normalizedBrandWallet.isBlank()) {
            throw new RuntimeException("Brand wallet is required for batch pre-mint signer resolution");
        }

        String platformWallet = credentials != null ? normalizeWallet(credentials.getAddress()) : "";
        if (!platformWallet.isBlank() && platformWallet.equals(normalizedBrandWallet)) {
            return credentials;
        }

        Credentials signer = brandMintSignerCredentials.get(normalizedBrandWallet);
        if (signer != null) {
            return signer;
        }

        throw new RuntimeException(
            "No signer private key configured for brand wallet " + brandWallet
                + ". Set WEB3_BRAND_PRIVATE_KEYS as wallet:privateKey mappings so the brand wallet pays mint gas."
        );
    }

    private String normalizeWallet(String walletAddress) {
        return String.valueOf(walletAddress == null ? "" : walletAddress).trim().toLowerCase(Locale.ROOT);
    }

    private String buildBatchPreMintRevertMessage(TransactionReceipt receipt, BigInteger submittedGasLimit, int itemCount) {
        if (receipt == null) {
            return "Transaction reverted on blockchain";
        }

        BigInteger gasUsed = receipt.getGasUsed();
        if (gasUsed != null && submittedGasLimit != null && gasUsed.compareTo(submittedGasLimit) >= 0) {
            return "Transaction reverted on blockchain (likely out of gas while pre-minting " + itemCount
                + " item(s); reduce batch size or metadata payload)";
        }

        return "Transaction reverted on blockchain";
    }

    private BigInteger resolveGasPrice(String operation) {
        BigInteger configuredGasPrice = null;
        try {
            configuredGasPrice = gasProvider.getGasPrice(operation);
        } catch (Exception e) {
            log.warn("Unable to read configured gas price for {}: {}", operation, e.getMessage());
        }

        try {
            BigInteger networkGasPrice = web3j.ethGasPrice().send().getGasPrice();
            BigInteger base = maxPositive(configuredGasPrice, networkGasPrice);

            if (base == null) {
                base = FALLBACK_GAS_PRICE_WEI;
            }

            BigInteger selectedGasPrice = base
                    .multiply(GAS_PRICE_MULTIPLIER_NUMERATOR)
                    .divide(GAS_PRICE_MULTIPLIER_DENOMINATOR);

            log.info(
                    "Resolved gas price for {}: configured={} network={} selected={}",
                    operation,
                    configuredGasPrice,
                    networkGasPrice,
                    selectedGasPrice
            );

            return selectedGasPrice;
        } catch (Exception e) {
            BigInteger fallback = configuredGasPrice != null && configuredGasPrice.signum() > 0
                    ? configuredGasPrice
                    : FALLBACK_GAS_PRICE_WEI;
            log.warn(
                    "Unable to fetch network gas price for {}. Using fallback gas price {}: {}",
                    operation,
                    fallback,
                    e.getMessage()
            );
            return fallback;
        }
    }

    private void logTransactionSubmitted(String operation, String txHash, BigInteger submittedGasPriceWei,
                                         String fromAddress, String toAddress, String txContext) {
        String submittedGwei = toGwei(submittedGasPriceWei);
        String details = String.format(
            "operation=%s txHash=%s chainId=%d from=%s to=%s submittedGasPriceWei=%s (~%s gwei) %s",
            operation,
            txHash,
            chainId,
            safeValue(fromAddress),
            safeValue(toAddress),
            String.valueOf(submittedGasPriceWei),
            submittedGwei,
            txContext
        );

        log.info("[BLOCKCHAIN_TX_SUBMITTED] {}", details);
        platformLogService.info(LogCategory.BLOCKCHAIN, "BLOCKCHAIN_TX_SUBMITTED", null, null,
            "TX", txHash, details);
    }

    private void logTransactionConfirmed(String operation, String txHash, TransactionReceipt receipt,
                                         BigInteger submittedGasPriceWei, String txContext) {
        if (receipt == null) {
            String details = "operation=" + operation + " txHash=" + txHash + " " + txContext;
            log.warn("[BLOCKCHAIN_TX_RECEIPT_TIMEOUT] {}", details);
            platformLogService.warn(LogCategory.BLOCKCHAIN, "BLOCKCHAIN_TX_RECEIPT_TIMEOUT", null, null,
                "TX", txHash, details);
            return;
        }

        BigInteger gasUsed = receipt.getGasUsed();
        String status = safeValue(receipt.getStatus());
        BigInteger blockNumber = receipt.getBlockNumber();

        EthTransaction txResp = null;
        org.web3j.protocol.core.methods.response.Transaction chainTx = null;
        try {
            txResp = web3j.ethGetTransactionByHash(txHash).send();
            chainTx = txResp != null ? txResp.getTransaction().orElse(null) : null;
        } catch (Exception e) {
            log.warn("Unable to fetch transaction details for tx {}: {}", txHash, e.getMessage());
        }

        String fromAddress = chainTx != null ? chainTx.getFrom() : null;
        String toAddress = chainTx != null ? chainTx.getTo() : contractAddress;
        BigInteger nonce = chainTx != null ? chainTx.getNonce() : null;
        BigInteger gasLimit = chainTx != null ? chainTx.getGas() : null;
        String txType = chainTx != null ? chainTx.getType() : null;

        BigInteger effectiveGasPriceWei = parseQuantitySafely(receipt.getEffectiveGasPrice());
        if ((effectiveGasPriceWei == null || effectiveGasPriceWei.signum() <= 0) && chainTx != null) {
            if (chainTx.getGasPrice() != null && chainTx.getGasPrice().signum() > 0) {
                effectiveGasPriceWei = chainTx.getGasPrice();
            } else if (chainTx.getMaxFeePerGas() != null && chainTx.getMaxFeePerGas().signum() > 0) {
                effectiveGasPriceWei = chainTx.getMaxFeePerGas();
            }
        }

        if (effectiveGasPriceWei == null || effectiveGasPriceWei.signum() <= 0) {
            effectiveGasPriceWei = submittedGasPriceWei;
        }

        BigInteger feeWei = (gasUsed != null && effectiveGasPriceWei != null)
            ? gasUsed.multiply(effectiveGasPriceWei)
            : null;

        String details = String.format(
            "operation=%s txHash=%s chainId=%d block=%s status=%s from=%s to=%s nonce=%s txType=%s gasUsed=%s gasLimit=%s effectiveGasPriceWei=%s (~%s gwei) feeWei=%s (~%s POL) %s",
            operation,
            txHash,
            chainId,
            String.valueOf(blockNumber),
            status,
            safeValue(fromAddress),
            safeValue(toAddress),
            String.valueOf(nonce),
            safeValue(txType),
            String.valueOf(gasUsed),
            String.valueOf(gasLimit),
            String.valueOf(effectiveGasPriceWei),
            toGwei(effectiveGasPriceWei),
            String.valueOf(feeWei),
            toPol(feeWei),
            txContext
        );

        log.info("[BLOCKCHAIN_TX_CONFIRMED] {}", details);
        platformLogService.info(LogCategory.BLOCKCHAIN, "BLOCKCHAIN_TX_CONFIRMED", null, null,
            "TX", txHash, details);
    }

    private BigInteger parseQuantitySafely(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        try {
            return Numeric.decodeQuantity(rawValue);
        } catch (Exception ignore) {
            try {
                return new BigInteger(rawValue);
            } catch (Exception innerIgnore) {
                return null;
            }
        }
    }

    private String toGwei(BigInteger wei) {
        return toDecimalUnit(wei, WEI_PER_GWEI, 6);
    }

    private String toPol(BigInteger wei) {
        return toDecimalUnit(wei, WEI_PER_POL, 9);
    }

    private String toDecimalUnit(BigInteger wei, BigDecimal unit, int scale) {
        if (wei == null) {
            return "0";
        }

        BigDecimal value = new BigDecimal(wei).divide(unit, scale, RoundingMode.HALF_UP).stripTrailingZeros();
        return value.toPlainString();
    }

    private String safeValue(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value;
    }

    private BigInteger maxPositive(BigInteger left, BigInteger right) {
        if (left == null || left.signum() <= 0) {
            if (right == null || right.signum() <= 0) {
                return null;
            }
            return right;
        }

        if (right == null || right.signum() <= 0) {
            return left;
        }

        return left.compareTo(right) >= 0 ? left : right;
    }

    private TransactionReceipt waitForReceipt(String txHash) throws Exception {
        int attempts = 0;
        while (attempts < 30) {
            EthGetTransactionReceipt receiptResponse = web3j.ethGetTransactionReceipt(txHash).send();
            if (receiptResponse.getTransactionReceipt().isPresent()) {
                TransactionReceipt receipt = receiptResponse.getTransactionReceipt().get();
                if (!receipt.isStatusOK()) {
                    throw new RuntimeException("Transaction reverted. TxHash: " + txHash);
                }
                return receipt;
            }
            Thread.sleep(1000);
            attempts++;
        }
        log.warn("Receipt not available after 30s for tx: {}", txHash);
        return null;
    }
}
