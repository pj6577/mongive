const { ethers } = require("ethers");
const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const artifact = await hre.artifacts.readArtifact("GichoSwap");
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
    "현재 이 주소로 트랜잭션을 만들겁니다. 당신의 잔고는 다음과 같습니다.",
    deployer,
    balance
  );

  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("배포중입니다");
  const contract = await contractFactory.deploy(deployer);
  console.log(
    "익스플로러에 검사해야하는 해시입니다",
    contract.deploymentTransaction().hash
  );
  console.log("배포된 주소는 다음과 같습니다", contract.target);

  // 트랜잭션이 완료될 때까지 기다립니다
  console.log("트랜잭션이 완료될 때까지 기다리는 중...");
  await contract.deploymentTransaction().wait();

  console.log("현재 premint한 값은 다음과 같습니다", await contract.balanceOf(deployer));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });