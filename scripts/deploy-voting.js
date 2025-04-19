const hre = require("hardhat");

async function main() {
  const MON_TOKEN = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; // Monad Testnet의 MON 토큰 주소
  const MIN_VOTE_AMOUNT = ethers.parseEther("0.1"); // 최소 투표 금액: 0.1 MON

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(MON_TOKEN, MIN_VOTE_AMOUNT, (await ethers.getSigners())[0].address);

  await voting.waitForDeployment();

  console.log("Voting deployed to:", await voting.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 