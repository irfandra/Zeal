package com.digitalseal.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.gas.ContractGasProvider;

@Configuration
@Slf4j
public class Web3jConfig {

    @Value("${web3.rpc.url}")
    private String rpcUrl;

    @Value("${web3.private.key:}")
    private String privateKey;

    @Bean
    public Web3j web3j() {
        log.info("Connecting to blockchain node: {}", rpcUrl);
        Web3j web3j = Web3j.build(new HttpService(rpcUrl));
        try {
            String clientVersion = web3j.web3ClientVersion().send().getWeb3ClientVersion();
            log.info("Connected to blockchain node: {}", clientVersion);
        } catch (Exception e) {
            log.warn("Could not connect to blockchain node at {}. Blockchain features will be unavailable.", rpcUrl);
        }
        return web3j;
    }

    @Bean
    public Credentials credentials() {
        if (privateKey == null || privateKey.isBlank()) {
            log.warn("No private key configured. Blockchain write operations will fail.");

            return Credentials.create("0x0000000000000000000000000000000000000000000000000000000000000001");
        }
        Credentials creds = Credentials.create(privateKey);
        log.info("Platform wallet loaded: {}", creds.getAddress());
        return creds;
    }

    @Bean
    public ContractGasProvider gasProvider() {
        return new DefaultGasProvider();
    }
}
