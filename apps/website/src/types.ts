export type TimerRequest = {
  txHash: `0x${string}`;
  from: `0x${string}`;
  requestId: bigint;
  randomNumber: bigint;
  startTime: number;
  endTime: number;
};