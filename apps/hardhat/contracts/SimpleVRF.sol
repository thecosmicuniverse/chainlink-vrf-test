// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";

contract SimpleVRF is VRFConsumerBaseV2Plus {
    event RandomnessFulfilled(uint256 requestId, uint256 randomNumber, uint256 blockNumber, uint256 timestamp);

    IVRFCoordinatorV2Plus public immutable coordinator;
    uint256 public immutable subscriptionId;
    bytes32 public immutable keyHash;

    constructor(address vrfCoordinator, uint256 subId, bytes32 _keyHash) VRFConsumerBaseV2Plus(vrfCoordinator) {
        coordinator = IVRFCoordinatorV2Plus(vrfCoordinator);
        subscriptionId = subId;
        keyHash = _keyHash;
    }

    function requestRandomNumber() external returns (uint256 requestId) {
        requestId = coordinator.requestRandomWords(VRFV2PlusClient.RandomWordsRequest({
        keyHash: keyHash,
        subId: subscriptionId,
        requestConfirmations: 1,
        callbackGasLimit: 100000,
        numWords: 1,
        extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false})) // new parameter
        }));
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        emit RandomnessFulfilled(requestId, randomWords[0], block.number, block.timestamp);
    }
}
