const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating pool with account:", deployer.address);

  // Factory 컨트랙트 주소
  const factoryAddress = "0x959681D306F8EFb97883b9D6a02b82242d5325eB";
  const factory = await hre.ethers.getContractAt("UniswapV3Factory", factoryAddress);

  // 토큰 주소
  const MON = "0x8d56e0D81d0FE0b94100B11947b1779a8485ec46"; // MON 토큰 주소
  const GC3 = "0x8d56e0D81d0FE0b94100B11947b1779a8485ec46"; // GC3 토큰 주소

  // 수수료 티어 (0.3%)
  const fee = 3000;

  console.log("Creating MON-GC3 pool...");
  const tx = await factory.createPool(MON, GC3, fee);
  await tx.wait();

  const poolAddress = await factory.getPool(MON, GC3, fee);
  console.log("Pool created at:", poolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 