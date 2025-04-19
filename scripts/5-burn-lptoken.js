const ethers = require("ethers");
const hre = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY_1, //본인의 private key를 입력해주세요
    provider
  );
  const artifact = hre.artifacts.readArtifactSync("UniswapV2Pair");
  const abi = artifact.abi;
  const pairAddress = "0x66F2E56fF2FB12D34905dEbdeDAd29FA34DD8642";

  const artifact2 = hre.artifacts.readArtifactSync("UniswapV2ERC20");
  const abi2 = artifact2.abi;

  const amountLP = ethers.parseUnits("10", 18);
  const lpToken = new ethers.Contract(pairAddress, abi2, wallet);

  const balLPBefore = await lpToken.balanceOf(wallet.address);
  const balPairBefore = await lpToken.balanceOf(pairAddress);
  console.log("Before - LP token - user:", balLPBefore.toString());
  console.log("Before - LP token - pair:", balPairBefore.toString());

  const tx = await lpToken.transfer(pairAddress, amountLP);
  await tx.wait();

  const balLPAfter = await lpToken.balanceOf(wallet.address);
  const balPairAfter = await lpToken.balanceOf(pairAddress);
  console.log("After - LP token - user:", balLPAfter.toString());
  console.log("After - LP token - pair:", balPairAfter.toString());

  const pair = new ethers.Contract(pairAddress, abi, wallet);
  const burn = await pair.burn(wallet.address);
  const receipt = await burn.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
