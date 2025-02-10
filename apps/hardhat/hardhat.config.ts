import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-viem";
import "hardhat-dependency-compiler";

const config: HardhatUserConfig = {
  defaultNetwork: "fuji",
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [vars.get("PRIVATE_KEY")],
    },
  },
  etherscan: {
    apiKey: {
      fuji: vars.get("SNOWSCAN_API_KEY"),
    },
    customChains: [
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          browserURL: "https://testnet.snowscan.xyz/",
          apiURL: "https://api-testnet.snowscan.xyz/api",
          // documentationURL: "https://docs.snowscan.xyz/v/fuji-snowscan"
        }
      }
    ]
  },
  dependencyCompiler: {
    paths: [
      '@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol'
    ]
  }
};

export default config;
