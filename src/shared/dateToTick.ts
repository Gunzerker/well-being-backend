export function dateToTicks(date: number) {
  const epochOffset = 621355968000000000;
  const ticksPerMillisecond = 10000;

  const ticks = date * ticksPerMillisecond + epochOffset;

  return ticks;
}
export function dateToTicksv2(date: any) {
  const epochOffset = 621355968000000000;
  const ticksPerMillisecond = 10000;

  const ticks = date * ticksPerMillisecond + epochOffset;

  return ticks;
}
