const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const readExistingContractAddress = (contractEnvPath) => {
  if (!contractEnvPath || !fs.existsSync(contractEnvPath)) {
    return null;
  }

  const content = fs.readFileSync(contractEnvPath, "utf8");
  const match = content.match(/^CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})$/m);
  return match ? match[1] : null;
};

const writeContractAddress = (contractEnvPath, contractAddress) => {
  if (!contractEnvPath) {
    return;
  }

  fs.mkdirSync(path.dirname(contractEnvPath), { recursive: true });
  fs.writeFileSync(contractEnvPath, `CONTRACT_ADDRESS=${contractAddress}\n`, "utf8");
  console.log(`Deployment artifact written to ${contractEnvPath}`);
};

async function main() {
  const contractEnvPath = process.env.CONTRACT_ENV_PATH;
  const [deployer] = await hre.ethers.getSigners();

  const chain = await hre.ethers.provider.getNetwork();
  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Deployer:", deployer.address);
  console.log("Chain ID:", chain.chainId.toString());
  console.log("Balance before (wei):", balanceBefore.toString());
  console.log("Balance before (MATIC):", hre.ethers.formatEther(balanceBefore));

  const existingAddress = readExistingContractAddress(contractEnvPath);
  if (existingAddress) {
    const code = await hre.ethers.provider.getCode(existingAddress);
    if (code && code !== "0x") {
      console.log(`Contract already deployed on this chain: ${existingAddress}`);
      const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
      const delta = balanceBefore - balanceAfter;
      console.log("No deployment tx sent. Balance delta (wei):", delta.toString());
      console.log("No deployment tx sent. Balance delta (MATIC):", hre.ethers.formatEther(delta));
      return;
    }
    console.log(
      `Existing CONTRACT_ADDRESS ${existingAddress} not found on current chain. Redeploying...`
    );
  }

  console.log("Deploying DigitalSeal with account:", deployer.address);

  const DigitalSeal = await hre.ethers.getContractFactory("DigitalSeal");
  const digitalSeal = await DigitalSeal.deploy(deployer.address);
  const deployReceipt = await digitalSeal.deploymentTransaction().wait();
  await digitalSeal.waitForDeployment();

  const contractAddress = await digitalSeal.getAddress();
  writeContractAddress(contractEnvPath, contractAddress);
  console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
  console.log("Contract Address:", contractAddress);
  console.log("Platform Wallet:", deployer.address);
  console.log("Deployment tx hash:", deployReceipt.hash);
  console.log("Deployment gas used:", deployReceipt.gasUsed.toString());
  console.log("Deployment gas price:", deployReceipt.gasPrice?.toString?.() ?? "n/a");
  console.log("Deployment fee (wei):", deployReceipt.fee?.toString?.() ?? "n/a");
  console.log("\nUpdate your backend .env with:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);

  const signers = await hre.ethers.getSigners();
  if (signers.length > 1) {
    const brandWallet = signers[1].address;
    const tx = await digitalSeal.authorizeBrand(brandWallet, true);
    const authReceipt = await tx.wait();
    console.log(`\nAuthorized brand wallet: ${brandWallet}`);
    console.log("Authorize tx hash:", authReceipt.hash);
    console.log("Authorize gas used:", authReceipt.gasUsed.toString());
    console.log("Authorize gas price:", authReceipt.gasPrice?.toString?.() ?? "n/a");
    console.log("Authorize fee (wei):", authReceipt.fee?.toString?.() ?? "n/a");
  }

  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  const balanceDelta = balanceBefore - balanceAfter;
  console.log("\nBalance after (wei):", balanceAfter.toString());
  console.log("Balance after (MATIC):", hre.ethers.formatEther(balanceAfter));
  console.log("Balance delta (wei):", balanceDelta.toString());
  console.log("Balance delta (MATIC):", hre.ethers.formatEther(balanceDelta));

  console.log("\n=== HARDHAT ACCOUNTS ===");
  console.log("Account #0 (Platform):", signers[0].address);
  if (signers.length > 1) console.log("Account #1 (Brand):", signers[1].address);
  if (signers.length > 2) console.log("Account #2 (Buyer):", signers[2].address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
