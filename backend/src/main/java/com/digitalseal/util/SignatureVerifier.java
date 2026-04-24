package com.digitalseal.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.web3j.crypto.ECDSASignature;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Component
@Slf4j
public class SignatureVerifier {

    private static final String PERSONAL_MESSAGE_PREFIX = "\u0019Ethereum Signed Message:\n";

    
    public boolean verifySignature(String address, String message, String signature) {
        try {

            byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
            String prefix = PERSONAL_MESSAGE_PREFIX + messageBytes.length;
            byte[] prefixBytes = prefix.getBytes(StandardCharsets.UTF_8);

            byte[] combined = new byte[prefixBytes.length + messageBytes.length];
            System.arraycopy(prefixBytes, 0, combined, 0, prefixBytes.length);
            System.arraycopy(messageBytes, 0, combined, prefixBytes.length, messageBytes.length);

            byte[] msgHash = Hash.sha3(combined);

        log.debug("Signature verification started: address={}, messageBytes={}, hash={}",
            maskAddress(address),
            messageBytes.length,
            Numeric.toHexString(msgHash));

            byte[] signatureBytes = Numeric.hexStringToByteArray(signature);
        log.debug("Signature bytes length: {}", signatureBytes.length);

            if (signatureBytes.length != 65) {
                log.error("Invalid signature length: {} (expected 65)", signatureBytes.length);
                return false;
            }

            byte[] r = Arrays.copyOfRange(signatureBytes, 0, 32);
            byte[] s = Arrays.copyOfRange(signatureBytes, 32, 64);
            byte v = signatureBytes[64];

            if (v < 27) {
                v += 27;
            }
            log.debug("Normalized v value: {}", v);

            ECDSASignature ecdsaSig = new ECDSASignature(
                    new BigInteger(1, r),
                    new BigInteger(1, s)
            );


            for (int recoveryId = 0; recoveryId < 4; recoveryId++) {
                try {
                    BigInteger publicKey = Sign.recoverFromSignature(recoveryId, ecdsaSig, msgHash);

                    if (publicKey != null) {
                        String recoveredAddress = "0x" + Keys.getAddress(publicKey);
                        log.debug("Recovery ID {} recovered address {}", recoveryId, maskAddress(recoveredAddress));

                        if (recoveredAddress.equalsIgnoreCase(address)) {
                            log.debug("Signature valid at recovery ID {}", recoveryId);
                            return true;
                        }
                    }
                } catch (Exception e) {
                    log.debug("Recovery ID {} failed: {}", recoveryId, e.getMessage());
                }
            }

            log.warn("Signature invalid for address {}", maskAddress(address));
            return false;

        } catch (Exception e) {
            log.error("Unexpected error verifying signature for address: {}", address, e);
            return false;
        }
    }

    private String maskAddress(String address) {
        if (address == null) {
            return "null";
        }

        String normalized = address.trim();
        if (normalized.length() <= 10) {
            return normalized;
        }

        return normalized.substring(0, 6) + "..." + normalized.substring(normalized.length() - 4);
    }
}