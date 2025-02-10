import { expect } from "chai";
import hre from "hardhat";
import { Address, zeroHash } from "viem";

describe("SimpleVRF", function () {
  let publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>;

  let vrfCoordinatorMock: Address;
  let simpleVRF: Address;

  const subscriptionId = 1;
  const keyHash = zeroHash;

  beforeEach(async () => {
    publicClient = await hre.viem.getPublicClient();

    const vrfCoordinatorMockData = await hre.viem.deployContract("VRFCoordinatorV2_5Mock", [subscriptionId, keyHash], { confirmations: 1 });
    vrfCoordinatorMock = vrfCoordinatorMockData.address;

    // Deploy SimpleVRF
    const simpleVRFData = await hre.viem.deployContract("SimpleVRF", [vrfCoordinatorMock, subscriptionId, keyHash], { confirmations: 1 });
    simpleVRF = simpleVRFData.address;
  });

  it("should deploy correctly and set appropriate state variables", async () => {
    // Check that contract values are as expected
    const contract =await hre.viem.getContractAt("SimpleVRF", simpleVRF)
    const contractSubscriptionId = await contract.read.subscriptionId();
    const contractKeyHash = await contract.read.keyHash();
    const contractCoordinator = await contract.read.coordinator();

    expect(contractSubscriptionId).to.equal(subscriptionId);
    expect(contractKeyHash).to.equal(keyHash);
    expect(contractCoordinator).to.equal(vrfCoordinatorMock);
  });

  it("should request a random number and return a requestId", async () => {
    const contract =await hre.viem.getContractAt("SimpleVRF", simpleVRF)
    // Trigger the requestRandomNumber function
    const hash = await contract.write.requestRandomNumber();
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

    // Verify the emitted requestId
    const log = receipt.logs.find(l => l.eventName === "RandomRequest");
    expect(log).to.not.be.undefined;
    expect(Number(log?.args?.requestId)).to.be.gt(0);
  });

  it("should emit RandomnessFulfilled event on VRF callback", async () => {
    const contract =await hre.viem.getContractAt("SimpleVRF", simpleVRF)
    // Call requestRandomNumber to simulate requesting random words
    const hash = await contract.write.requestRandomNumber();
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    const requestId = receipt.logs?.find((e) => e.eventName === "RandomRequest")?.args?.requestId;

    const coordinatorMock  =await hre.viem.getContractAt("VRFCoordinatorV2_5Mock", vrfCoordinatorMock)

    // Simulate the VRF Coordinator callback to fulfill the random number request
    const randomWords = [42]; // Example random number
    await expect(
      coordinatorMock.write.fulfillRandomWords([requestId, contract.address])
    ).to.emit(simpleVRF, "RandomnessFulfilled")
      .withArgs(
        requestId,
        randomWords[0],
        await publicClient.getBlockNumber(),
        (await publicClient.getBlock()).timestamp
      );
  });

  it("should revert if fulfillRandomWords is called from an unauthorized address", async () => {
    const contract =await hre.viem.getContractAt("SimpleVRF", simpleVRF)
    // Call requestRandomNumber to simulate requesting random words
    const hash = await contract.write.requestRandomNumber();
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    const requestId = receipt.logs?.find((e) => e.eventName === "RandomRequest")?.args?.requestId;

    // Attempt to call fulfillRandomWords from an address other than VRFCoordinator
    const { account: unauthorizedCaller } = (await hre.viem.getWalletClients())[1];
    await expect(
      contract.write.rawFulfillRandomWords([requestId, [123n]], { account: unauthorizedCaller})
    ).to.be.revertedWith("Only the VRFCoordinator can call this function");
  });
});