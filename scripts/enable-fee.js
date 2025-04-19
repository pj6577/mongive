const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Enabling fee tiers with account:", deployer.address);

  // Factory 컨트랙트 주소
  const factoryAddress = "0x959681D306F8EFb97883b9D6a02b82242d5325eB";
  const factory = await hre.ethers.getContractAt("UniswapV3Factory", factoryAddress);

  // 수수료 티어 활성화 (0.3%, 1%, 0.05%)
  const feeTiers = [3000, 10000, 500];
  const tickSpacings = [60, 200, 10];

  for (let i = 0; i < feeTiers.length; i++) {
    console.log(`Enabling fee tier ${feeTiers[i]} with tick spacing ${tickSpacings[i]}...`);
    const tx = await factory.enableFeeAmount(feeTiers[i], tickSpacings[i]);
    await tx.wait();
    console.log(`Fee tier ${feeTiers[i]} enabled!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 