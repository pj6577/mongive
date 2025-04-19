const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Adding liquidity with account:", deployer.address);

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

  // 유동성 추가 파라미터
  const tickLower = -887220; // 최소 틱
  const tickUpper = 887220;  // 최대 틱
  const amount = ethers.parseEther("1.0"); // 1.0 토큰

  console.log("Adding liquidity...");
  const tx = await pool.mint(
    deployer.address,
    tickLower,
    tickUpper,
    amount,
    "0x"
  );
  await tx.wait();
  console.log("Liquidity added!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 