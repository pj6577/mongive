require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const DEFAULT_COMPILER_SETTINGS = {
  version: "0.8.22",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: "paris",
  },
  metadata: {
    bytecodeHash: "none",
  },
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS],
  },
  networks: {
    hardhat: {
      chainId: 10143,
    },
    "monad-testnet": {
      url: "https://testnet-rpc.monad.xyz",
      accounts: [
        process.env.PRIVATE_KEY_1,
      ],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    node_modules: "./node_modules"
  }
};