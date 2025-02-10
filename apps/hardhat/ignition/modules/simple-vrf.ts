import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Address } from "viem";

const VRF_COORDINATOR: Address = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
const SUB_ID: bigint = 71049531047156375077720865804266575258889020338648943929284138857790579591324n;
const KEY_HASH: Address = "0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887";

const SimpleVRFModule = buildModule("SimpleVRFModule", (m) => {
  // address vrfCoordinator, uint64 subId, bytes32 _keyHash
  const coordinator = m.getParameter("coordinator", VRF_COORDINATOR);
  const subId = m.getParameter("subId", SUB_ID);
  const keyHash = m.getParameter("keyHash", KEY_HASH);

  const simpleVrf = m.contract("SimpleVRF", [coordinator, subId, keyHash]);

  return { simpleVrf };
});

export default SimpleVRFModule;
