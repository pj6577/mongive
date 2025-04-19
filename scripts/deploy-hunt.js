const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // GameCoin 주소 (Monad Testnet)
  const gameCoinAddress = "0xDD1EA6192aD74bD0E8e8202D94AfC94006Fedb12";

  // AutoHunt 컨트랙트 배포
  const AutoHunt = await hre.ethers.getContractFactory("AutoHunt");
  const autoHunt = await AutoHunt.deploy(gameCoinAddress);
  await autoHunt.deployed();

  console.log("AutoHunt deployed to:", autoHunt.address);

  // 배포된 컨트랙트 정보 저장
  const contractInfo = {
    gameCoin: {
      address: gameCoinAddress,
      abi: await hre.ethers.getContractFactory("GameCoin").then(f => f.interface.format("json"))
    },
    autoHunt: {
      address: autoHunt.address,
      abi: await autoHunt.interface.format("json")
    },
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