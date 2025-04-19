const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // MON 토큰 주소
  const monTokenAddress = "0x8d56e0D81d0FE0b94100B11947b1779a8485ec46";

  const SlotMachine = await hre.ethers.getContractFactory("SlotMachine");
  const slotMachine = await SlotMachine.deploy(monTokenAddress);
  await slotMachine.waitForDeployment();

  console.log("SlotMachine deployed to:", await slotMachine.getAddress());

  // 배포된 컨트랙트 정보 저장
  const contractInfo = {
    address: await slotMachine.getAddress(),
    abi: await slotMachine.interface.format("json"),
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