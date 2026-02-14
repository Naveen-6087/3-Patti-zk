import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  const treasuryAddress = deployer.address;
  console.log("Treasury address:", treasuryAddress);

  // ========================================
  // 1. Deploy TeenPattiToken
  // ========================================
  console.log("\n Deploying TeenPattiToken...");
  const TeenPattiToken = await hre.ethers.getContractFactory("TeenPattiToken");
  const token = await TeenPattiToken.deploy(treasuryAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("TeenPattiToken deployed to:", tokenAddress);

  // ========================================
  // 2. Deploy ZK Verifier Contracts
  // ========================================
  console.log("\n Deploying ShuffleVerifier...");
  const ShuffleVerifier = await hre.ethers.getContractFactory("ShuffleVerifier");
  const shuffleVerifier = await ShuffleVerifier.deploy();
  await shuffleVerifier.waitForDeployment();
  const shuffleVerifierAddress = await shuffleVerifier.getAddress();
  console.log("ShuffleVerifier deployed to:", shuffleVerifierAddress);

  console.log("\n Deploying DealVerifier...");
  const DealVerifier = await hre.ethers.getContractFactory("DealVerifier");
  const dealVerifier = await DealVerifier.deploy();
  await dealVerifier.waitForDeployment();
  const dealVerifierAddress = await dealVerifier.getAddress();
  console.log("DealVerifier deployed to:", dealVerifierAddress);

  console.log("\n Deploying ShowVerifier...");
  const ShowVerifier = await hre.ethers.getContractFactory("ShowVerifier");
  const showVerifier = await ShowVerifier.deploy();
  await showVerifier.waitForDeployment();
  const showVerifierAddress = await showVerifier.getAddress();
  console.log("ShowVerifier deployed to:", showVerifierAddress);

  // ========================================
  // 3. Deploy TeenPattiGame (with verifier addresses)
  // ========================================
  console.log("\n Deploying TeenPattiGame...");
  const TeenPattiGame = await hre.ethers.getContractFactory("TeenPattiGame");
  const game = await TeenPattiGame.deploy(
    tokenAddress,
    treasuryAddress,
    shuffleVerifierAddress,
    dealVerifierAddress,
    showVerifierAddress
  );
  await game.waitForDeployment();
  const gameAddress = await game.getAddress();
  console.log("TeenPattiGame deployed to:", gameAddress);

  // ========================================
  // Save deployment info
  // ========================================
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    treasury: treasuryAddress,
    contracts: {
      TeenPattiToken: tokenAddress,
      ShuffleVerifier: shuffleVerifierAddress,
      DealVerifier: dealVerifierAddress,
      ShowVerifier: showVerifierAddress,
      TeenPattiGame: gameAddress
    },
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(
    deploymentsDir,
    `${hre.network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentFile);
  
  const latestFile = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Latest deployment saved to:", latestFile);
  
  // ========================================
  // Copy ABIs to backend and frontend
  // ========================================
  console.log("\nCopying ABIs to backend...");
  const backendAbiDir = path.join(__dirname, "../../backend/blockchain/abis");
  if (!fs.existsSync(backendAbiDir)) {
    fs.mkdirSync(backendAbiDir, { recursive: true });
  }
  
  const tokenArtifact = await hre.artifacts.readArtifact("TeenPattiToken");
  const gameArtifact = await hre.artifacts.readArtifact("TeenPattiGame");
  
  fs.writeFileSync(
    path.join(backendAbiDir, "TeenPattiToken.json"),
    JSON.stringify(tokenArtifact, null, 2)
  );
  fs.writeFileSync(
    path.join(backendAbiDir, "TeenPattiGame.json"),
    JSON.stringify(gameArtifact, null, 2)
  );
  console.log("ABIs copied to backend");
  
  console.log("\nCopying ABIs to frontend...");
  const frontendAbiDir = path.join(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(frontendAbiDir, "TeenPattiToken.json"),
    JSON.stringify(tokenArtifact, null, 2)
  );
  fs.writeFileSync(
    path.join(frontendAbiDir, "TeenPattiGame.json"),
    JSON.stringify(gameArtifact, null, 2)
  );
  fs.writeFileSync(
    path.join(frontendAbiDir, "addresses.json"),
    JSON.stringify({
      [hre.network.name]: {
        TeenPattiToken: tokenAddress,
        ShuffleVerifier: shuffleVerifierAddress,
        DealVerifier: dealVerifierAddress,
        ShowVerifier: showVerifierAddress,
        TeenPattiGame: gameAddress
      }
    }, null, 2)
  );
  console.log("ABIs and addresses copied to frontend");

  // ========================================
  // Summary
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("-------------------");
  console.log("TeenPattiToken:   ", tokenAddress);
  console.log("ShuffleVerifier:  ", shuffleVerifierAddress);
  console.log("DealVerifier:     ", dealVerifierAddress);
  console.log("ShowVerifier:     ", showVerifierAddress);
  console.log("TeenPattiGame:    ", gameAddress);
  console.log("\nNetwork:", hre.network.name);
  console.log("Treasury:", treasuryAddress);
  console.log("=".repeat(60));
  
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nTo verify contracts, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${tokenAddress} ${treasuryAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${shuffleVerifierAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${dealVerifierAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${showVerifierAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${gameAddress} ${tokenAddress} ${treasuryAddress} ${shuffleVerifierAddress} ${dealVerifierAddress} ${showVerifierAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
