import type { RuleId } from './schema.js';

export type ResultKind = 'pass' | 'fail' | 'open' | 'review' | 'notApplicable';
export type EvidenceLevel = 'emulated' | 'physical';
export type EmulationMethod =
  | 'cdp-metrics'
  | 'cdp-displayFeature'
  | 'cdp-posture'
  | 'keyboard-shrink'
  | 'keyboard-overlay-approx'
  | 'viewport-only'
  | 'none';

export interface ElementLocation {
  selector?: string;
  role?: string | null;
  name?: string;
  rect?: { x: number; y: number; w: number; h: number };
}

export interface Finding {
  rule: RuleId;
  kind: ResultKind;
  message: string;
  locations?: ElementLocation[];
  details?: Record<string, unknown>;
  emulation?: EmulationMethod[];
}

export interface StepResult {
  index: number;
  label: string;
  kind: 'startup' | 'transition' | 'operate';
  configuration: Record<string, unknown>;
  expected?: Record<string, unknown>;
  observed?: Record<string, unknown>;
  findings: Finding[];
  artifacts: { screenshot?: string; snapshot?: Record<string, unknown>; continuity?: unknown };
  durationMs: number;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioFile?: string;
  scenarioHash: string;
  title: string;
  profileId: string;
  profileRevision: number;
  adapter: string;
  engine: { name: string; version: string };
  evidenceLevel: EvidenceLevel;
  startedAt: string;
  durationMs: number;
  steps: StepResult[];
  gaps: string[];
  /** overall: pass if every required rule passed; fail if any failed; open if any required rule was open/review */
  verdict: 'pass' | 'fail' | 'open' | 'notApplicable';
  expected: { verdict: 'pass' | 'fail'; rules: RuleId[] };
  /** whether verdict matched `expected` (fixtures) */
  matchedExpectation: boolean;
}

export interface CoverageRow {
  scenarioId: string;
  profileId: string;
  step: number;
  rule: RuleId;
  kind: ResultKind | 'expected';
  reason?: string;
}

export interface RunReport {
  tool: { name: string; version: string; oracleVersion: string };
  startedAt: string;
  baseUrl: string;
  appBuild?: string;
  results: ScenarioResult[];
  coverage: CoverageRow[];
  exitCode: 0 | 1 | 2 | 3;
}
