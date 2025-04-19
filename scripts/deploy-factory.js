require('dotenv').config()
const { ethers } = require("ethers");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const UniswapV3Factory = await hre.ethers.getContractFactory("UniswapV3Factory");
  const factory = await UniswapV3Factory.deploy();
  await factory.waitForDeployment();

  console.log("UniswapV3Factory deployed to:", await factory.getAddress());

  // 배포된 컨트랙트 정보 저장
  const contractInfo = {
    address: await factory.getAddress(),
    abi: await factory.interface.format("json"),
    deployer: deployer.address,
    network: 'monad-testnet',
    timestamp: new Date().toISOString()
  }

  console.log('컨트랙트 정보:', JSON.stringify(contractInfo, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 