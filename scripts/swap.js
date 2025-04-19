const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing swap with account:", deployer.address);

  // 토큰 주소
  const MON = "0x8d56e0D81d0FE0b94100B11947b1779a8485ec46"; // MON 토큰 주소
  const GC3 = "0x8d56e0D81d0FE0b94100B11947b1779a8485ec46"; // GC3 토큰 주소

  // Factory 컨트랙트 주소
  const factoryAddress = "0x959681D306F8EFb97883b9D6a02b82242d5325eB";
  const factory = await hre.ethers.getContractAt("UniswapV3Factory", factoryAddress);

  // 풀 주소 가져오기
  const fee = 3000;
  const poolAddress = await factory.getPool(MON, GC3, fee);
  console.log("Pool address:", poolAddress);

  // 풀 컨트랙트 가져오기
  const pool = await hre.ethers.getContractAt("UniswapV3Pool", poolAddress);

  // 스왑 파라미터
  const amountIn = ethers.parseEther("0.1"); // 0.1 토큰
  const zeroForOne = true; // MON -> GC3 스왑

  console.log("Executing swap...");
  const tx = await pool.swap(
    deployer.address,
    zeroForOne,
    amountIn,
    0, // sqrtPriceLimitX96
    "0x" // data
  );
  await tx.wait();
  console.log("Swap executed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 