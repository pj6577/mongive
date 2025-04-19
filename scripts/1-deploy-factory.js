require('dotenv').config()
const { ethers } = require("ethers");
const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const artifact = await hre.artifacts.readArtifact("UniswapV2Factory");
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;

  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY_1,
    provider
  );

  const balance = await provider.getBalance(wallet.address);
  const deployer = wallet.address;

  console.log(
    "하기 주소는 밸런스 가지고 있고, 이걸로 배포하겠습니다",
    deployer,
    balance
  );

  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("배포하겠습니다");
  const contract = await contractFactory.deploy(deployer);
  console.log(
    '배포 트랜잭션 해시값입니다. 익스플로러에 검사해주세요',
    contract.deploymentTransaction().hash,
  );
  console.log("배포되었습니다", contract.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
