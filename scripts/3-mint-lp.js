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

  const IERC20 = await hre.artifacts.readArtifact("IERC20");
  const IERC20abi = IERC20.abi;

  const token0 = "0x825430B101D75b21E966c7406FaE045D65C13220";
  const token1 = "0xBBCD4ce6F2b91F809846cF5eD59Ef67cB90B0E6C";


  const amount0 = ethers.parseUnits("1000", 18);
  const amount1 = ethers.parseUnits("1000", 18);

  const token0Contract = new ethers.Contract(token0, IERC20abi, wallet);
  const token1Contract = new ethers.Contract(token1, IERC20abi, wallet);

  const approve0 = await token0Contract.approve(pairAddress, amount0);
  await approve0.wait();
  const approve1 = await token1Contract.approve(pairAddress, amount1);
  await approve1.wait();

  console.log('승인완료, 토큰 전송하겠습니다');

  const tx0 = await token0Contract.transfer(pairAddress, amount0);
  const tx0Receipt = await tx0.wait();
  console.log('Token0 transfer hash:', tx0Receipt.hash);
  
  const tx1 = await token1Contract.transfer(pairAddress, amount1);
  const tx1Receipt = await tx1.wait();
  console.log('Token1 transfer hash:', tx1Receipt.hash);

  console.log('토큰 전송완료, 이제 페어 컨트랙트에서 페어 토큰 발행하겠습니다');

  const pair = new ethers.Contract(pairAddress, abi, wallet);
  
  // 페어 컨트랙트 상태 확인
  const token0Balance = await token0Contract.balanceOf(pairAddress);
  const token1Balance = await token1Contract.balanceOf(pairAddress);
  const totalSupply = await pair.totalSupply();
  const reserves = await pair.getReserves();
  
  console.log('Token0 balance in pair:', ethers.formatUnits(token0Balance, 18));
  console.log('Token1 balance in pair:', ethers.formatUnits(token1Balance, 18));
  console.log('Total supply:', ethers.formatUnits(totalSupply, 18));
  console.log('Reserves:', {
    reserve0: ethers.formatUnits(reserves[0], 18),
    reserve1: ethers.formatUnits(reserves[1], 18)
  });

  const mint = await pair.mint(wallet.address);
  const receipt = await mint.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });