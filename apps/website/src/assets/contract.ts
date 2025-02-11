export const address = "0xDF2F72B1C3077EfB4F829a9dd5937A92263f6AFA";
export const abi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: false, internalType: "uint256", name: "requestId", type: "uint256" }
    ],
    name: "RandomNumberRequested",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "randomNumber", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "blockNumber", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "RandomnessFulfilled",
    type: "event"
  },
  {
    inputs: [],
    name: "requestRandomNumber",
    outputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;
