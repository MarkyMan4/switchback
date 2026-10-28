export type LevelDef = {
  name: string;
  hairpins: number;
  z0: number;
  roadAmp: number | ((t: number) => number);
  turnRadius: number | ((t: number) => number);
};

export function sampleLevelParam(value: number | ((t: number) => number), t: number) {
  return typeof value === 'function' ? value(t) : value;
}

export const LEVELS: LevelDef[] = [
  {
    name: 'Switchback',
    hairpins: 7,
    z0: -50,
    roadAmp: 38,
    turnRadius: 16,
  },
  {
    name: 'Squeeze',
    hairpins: 7,
    z0: -50,
    roadAmp: (t) => 38 - 22 * t * t,
    turnRadius: 16,
  },
];
