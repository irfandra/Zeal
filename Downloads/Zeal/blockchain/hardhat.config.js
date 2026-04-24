require("@nomicfoundation/hardhat-toolbox");

const parseIntegerEnv = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const POLYGON_LIKE_CHAIN_ID = parseIntegerEnv(process.env.POLYGON_LIKE_CHAIN_ID, 80002);
const POLYGON_LIKE_INITIAL_BASE_FEE_WEI = parseIntegerEnv(
  process.env.POLYGON_LIKE_INITIAL_BASE_FEE_WEI,
  30_000_000_000
);
const POLYGON_LIKE_MINING_INTERVAL_MS = parseIntegerEnv(process.env.POLYGON_LIKE_MINING_INTERVAL_MS, 2000);
const POLYGON_LIKE_BLOCK_GAS_LIMIT = parseIntegerEnv(process.env.POLYGON_LIKE_BLOCK_GAS_LIMIT, 30_000_000);

const HARDHAT_CHAIN_ID = parseIntegerEnv(process.env.HARDHAT_CHAIN_ID, POLYGON_LIKE_CHAIN_ID);
const HARDHAT_INITIAL_BASE_FEE_WEI = parseIntegerEnv(
  process.env.HARDHAT_INITIAL_BASE_FEE_WEI,
  POLYGON_LIKE_INITIAL_BASE_FEE_WEI
);
const HARDHAT_MINING_INTERVAL_MS = parseIntegerEnv(process.env.HARDHAT_MINING_INTERVAL_MS, POLYGON_LIKE_MINING_INTERVAL_MS);
const HARDHAT_BLOCK_GAS_LIMIT = parseIntegerEnv(process.env.HARDHAT_BLOCK_GAS_LIMIT, POLYGON_LIKE_BLOCK_GAS_LIMIT);


module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {

      chainId: HARDHAT_CHAIN_ID,
      initialBaseFeePerGas: HARDHAT_INITIAL_BASE_FEE_WEI,
      blockGasLimit: HARDHAT_BLOCK_GAS_LIMIT,
      mining: {

        auto: false,
        interval: HARDHAT_MINING_INTERVAL_MS,
      },
      accounts: {
        count: 10,
        accountsBalance: "10000000000000000000000000",
      },
    },
    localhost: {
      url: process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545",
      chainId: HARDHAT_CHAIN_ID,
    },
  },
};