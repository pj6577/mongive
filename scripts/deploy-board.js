const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // MON 토큰 주소
  const MON_TOKEN_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

  const Board = await hre.ethers.getContractFactory("Board");
  const board = await Board.deploy(deployer.address, MON_TOKEN_ADDRESS);

  await board.waitForDeployment();

  console.log("Board deployed to:", await board.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 