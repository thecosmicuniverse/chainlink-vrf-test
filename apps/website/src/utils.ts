import { createPublicClient, http } from "viem";
import { abi, address } from "./assets/contract";
import { avalancheFuji } from "viem/chains";
import { TimerRequest } from "./types.ts";

export const formatAddress = (address: string | bigint) => String(address).slice(0, 6) + "..." + String(address).slice(-4);
export const formatDateString = (date: number) => (new Date(date)).toISOString().replace(/\..*$/, "").replace("T", " ").replace("2025-", "");

export const getRecentEvents = async () => {
  const fromBlockOffset = 1000n;
  const client = createPublicClient({ chain: avalancheFuji, transport: http(avalancheFuji.rpcUrls.default.http[0]) });

  try {
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock - fromBlockOffset > 0n ? latestBlock - fromBlockOffset : 0n;

    const requestedEvents = await client.getLogs({ address, event: abi[0], fromBlock, toBlock: latestBlock });
    const fulfilledEvents = await client.getLogs({ address, event: abi[1], fromBlock, toBlock: latestBlock });

    // Parse and combine the event data
    const parsedRequestedEvents = requestedEvents.map((log) => ({
      from: log.args.from!,
      requestId: log.args.requestId!,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      startTime: 0
    }));

    const parsedFulfilledEvents = fulfilledEvents.map((log) => ({
      requestId: log.args.requestId,
      randomNumber: log.args.randomNumber!,
      blockNumber: log.blockNumber,
      endTime: 0,
    }));

    const blockNumbers: bigint[] = [...new Set([...parsedRequestedEvents, ...parsedFulfilledEvents].map(e => e.blockNumber))]
    const timestamps = await Promise.all(blockNumbers.map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber})
      return block.timestamp;
    }))
    const timestampMap = timestamps.reduce((acc, timestamp, index) => {
      acc[blockNumbers[index].toString()] = Number(timestamp) * 1000
      return acc
    }, {} as Record<string, number>)

    parsedRequestedEvents.forEach(e => e.startTime = timestampMap[e.blockNumber.toString()])
    parsedFulfilledEvents.forEach(e => e.endTime = timestampMap[e.blockNumber.toString()])

    return parsedRequestedEvents.reduce((acc, event) => {
      const fulfilledEvent = parsedFulfilledEvents.find(e => e.requestId === event.requestId)
      acc[event.txHash] = {
        from: event.from,
        txHash: event.txHash,
        requestId: event.requestId,
        startTime: event.startTime,
        endTime: fulfilledEvent ? fulfilledEvent.endTime : 0,
        randomNumber: fulfilledEvent ? fulfilledEvent.randomNumber : 0n,
      }
      return acc
    }, {} as Record<string, TimerRequest>)

  } catch (error) {
    console.error("Error fetching events:", error);
    return {};
  }
};
