/**
 * foldproof core schemas (spec revision 1.1).
 *
 * Rules (docs/SPEC-v1.md §6, docs/research/02 §3 and §5, council 2026-10-28):
 *  - every number carries a unit;
 *  - every value carries provenance: `published` (quoted), `derived` (formula stated) or `measured` (tool + date);
 *  - unknowns are listed and typed, never defaulted;
 *  - conflicting registries are recorded side by side, never averaged;
 *  - profiles hold device/registry facts only; browser capabilities live in engines/, test choices in scenarios;
 *  - the posture → expected web signals mapping is data (`postures[].web`), not adapter code.
 */
import { z } from 'zod';

// ---------- shared ----------

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ID = /^[a-z0-9][a-z0-9-]{1,80}$/;

export const ProvenanceKind = z.enum(['published', 'derived', 'measured']);
export type ProvenanceKind = z.infer<typeof ProvenanceKind>;

export const LengthUnit = z.enum(['css_px', 'dp', 'pt', 'device_px']);
export type LengthUnit = z.infer<typeof LengthUnit>;
const LogicalUnit = z.enum(['css_px', 'dp', 'pt']);

export const Size = z.object({ w: z.number().positive(), h: z.number().positive() }).strict();
export const Rect = z
  .object({ x: z.number().min(0), y: z.number().min(0), w: z.number().min(0), h: z.number().min(0) })
  .strict();
export const Insets = z
  .object({ top: z.number().min(0), right: z.number().min(0), bottom: z.number().min(0), left: z.number().min(0) })
  .strict();

export const Source = z
  .object({
    id: z.string().regex(ID, 'source id: lowercase, digits, hyphens'),
    url: z.string().url(),
    publisher: z.string().min(1),
    inspected: z.string().regex(ISO_DATE, 'inspected must be YYYY-MM-DD'),
    licence: z.string().min(1).describe('SPDX id, "vendor-fact" for quoted specifications, or "measured"'),
    kind: ProvenanceKind,
    revision: z.string().optional().describe('upstream version / commit / page revision the value was read from'),
    quote: z.string().optional().describe('verbatim text the value was taken from'),
    note: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

// ---------- profile ----------

export const Platform = z.enum(['web', 'android', 'ios', 'ipados', 'windows', 'automotive', 'tv']);
export const ProfileKind = z.enum(['device', 'emulator-profile', 'registry-entry']);
export const PanelName = z.enum(['inner', 'outer', 'single']);
export const Orientation = z.enum(['portrait', 'landscape']);
export type Orientation = z.infer<typeof Orientation>;

export const Panel = z
  .object({
    name: PanelName,
    physical_px: Size,
    diagonal_in: z.number().positive().optional(),
    ppi: z.number().positive().optional(),
    density_dpi: z.number().positive().optional().describe('Android density bucket, e.g. 420'),
    source_ref: z.string(),
  })
  .strict();

const withDerivation = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .strict()
    .refine((v) => (v as { kind: string }).kind !== 'derived' || !!(v as { derivation?: string }).derivation, {
      message: 'derived values must state their derivation',
      path: ['derivation'],
    });

export const Logical = withDerivation({
  panel: PanelName,
  orientation: Orientation,
  unit: LogicalUnit,
  w: z.number().positive(),
  h: z.number().positive(),
  scale: z.number().positive().describe('devicePixelRatio / density factor / iOS scale'),
  kind: ProvenanceKind,
  derivation: z.string().optional(),
  source_ref: z.string(),
  registry: z.string().optional().describe('e.g. "playwright deviceDescriptorsSource.json: Galaxy Z Fold 7"'),
});

export const Usable = withDerivation({
  panel: PanelName,
  orientation: Orientation,
  unit: LogicalUnit,
  layout_viewport: Size,
  visual_viewport: Size.optional(),
  insets: Insets,
  cutouts: z.array(Rect).default([]),
  kind: ProvenanceKind,
  derivation: z.string().optional(),
  source_ref: z.string(),
});

export const DisplayFeature = withDerivation({
  id: z.string().regex(ID),
  panel: PanelName,
  type: z.enum(['fold', 'hinge']),
  orientation: z.enum(['vertical', 'horizontal']).describe('vertical = splits left/right'),
  bounds: Rect,
  unit: LogicalUnit,
  occlusion: z.enum(['none', 'full']),
  is_separating: z.boolean().optional(),
  kind: ProvenanceKind,
  derivation: z.string().optional(),
  source_ref: z.string(),
});

export const PostureName = z.enum(['closed', 'half_opened', 'flat', 'book', 'tabletop', 'tent']);
export type PostureName = z.infer<typeof PostureName>;
export const Posture = z
  .object({
    name: PostureName,
    panel: PanelName,
    orientation: Orientation.optional().describe('the orientation this posture (and its display feature) is expressed in; the resolver prefers it when a scenario gives none'),
    web: z
      .object({
        posture: z.enum(['continuous', 'folded']),
        segments: z.union([z.literal(1), z.literal(2)]).describe('expected viewport segment count the self-check asserts'),
      })
      .strict(),
    android_state: z.enum(['FLAT', 'HALF_OPENED']).nullable().optional(),
    hinge_angle_range_deg: z.tuple([z.number(), z.number()]).optional(),
    display_feature: z.string().optional().describe('id of the display feature active in this posture'),
    source_ref: z.string(),
  })
  .strict();

export const Inputs = z
  .object({
    pointer: z.enum(['fine', 'coarse', 'none']),
    hover: z.enum(['hover', 'none']),
    touch: z.boolean(),
    keyboard: z.enum(['hardware', 'soft', 'both', 'none']),
    remote_dpad: z.boolean().optional(),
    rotary: z.boolean().optional(),
    voice: z.boolean().optional(),
    source_ref: z.string(),
  })
  .strict();

export const OperatingState = z
  .object({
    name: z.enum(['parked', 'driving']),
    requires_distraction_optimization: z.boolean(),
    ux_restrictions_mask: z.number().int().optional(),
    source_ref: z.string(),
  })
  .strict();

export const Conflict = z.object({ profile_id: z.string(), field: z.string(), note: z.string().min(1) }).strict();

export const Unknown = z.object({ field: z.string().min(1), reason: z.string().min(1) }).strict();

export const KeyboardHeight = withDerivation({
  unit: z.literal('css_px'),
  min: z.number().positive(),
  max: z.number().positive(),
  kind: ProvenanceKind,
  derivation: z.string().optional(),
  source_ref: z.string(),
});

export const Profile = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(ID),
    revision: z.number().int().min(1),
    supersedes: z.string().optional(),
    kind: ProfileKind,
    platform: Platform,
    name: z.string().min(1),
    vendor: z.string().optional(),
    released: z.string().regex(ISO_DATE).optional(),
    sources: z.array(Source).min(1),
    panels: z.array(Panel).min(1),
    logical: z.array(Logical).default([]),
    usable: z.array(Usable).default([]),
    display_features: z.array(DisplayFeature).default([]),
    postures: z.array(Posture).default([]),
    inputs: Inputs,
    keyboard_height: KeyboardHeight.optional().describe('only from a cited measurement; otherwise absent and listed in unknowns'),
    operating_states: z.array(OperatingState).default([]),
    conflicts_with: z.array(Conflict).default([]),
    unknowns: z.array(Unknown).describe('required even if empty: keeps gaps visible'),
    tags: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = new Set(p.sources.map((s) => s.id));
    const check = (ref: string, path: (string | number)[]) => {
      if (!ids.has(ref)) ctx.addIssue({ code: 'custom', message: `source_ref "${ref}" is not a declared source`, path });
    };
    p.panels.forEach((x, i) => check(x.source_ref, ['panels', i, 'source_ref']));
    p.logical.forEach((x, i) => check(x.source_ref, ['logical', i, 'source_ref']));
    p.usable.forEach((x, i) => check(x.source_ref, ['usable', i, 'source_ref']));
    p.display_features.forEach((x, i) => check(x.source_ref, ['display_features', i, 'source_ref']));
    p.postures.forEach((x, i) => {
      check(x.source_ref, ['postures', i, 'source_ref']);
      const feat = x.display_feature ? p.display_features.find((f) => f.id === x.display_feature) : undefined;
      if (x.display_feature && !feat) {
        ctx.addIssue({ code: 'custom', message: `posture refers to unknown display_feature "${x.display_feature}"`, path: ['postures', i, 'display_feature'] });
      }
      if (feat && feat.panel !== x.panel) {
        ctx.addIssue({ code: 'custom', message: `display_feature "${feat.id}" belongs to panel "${feat.panel}", posture is on "${x.panel}"`, path: ['postures', i, 'display_feature'] });
      }
      const expectTwo = !!feat;
      if ((x.web.segments === 2) !== expectTwo) {
        ctx.addIssue({ code: 'custom', message: `web.segments must be 2 iff a display_feature is active (feature: ${feat ? feat.id : 'none'})`, path: ['postures', i, 'web', 'segments'] });
      }
      if (x.web.posture === 'folded' && !feat) {
        ctx.addIssue({ code: 'custom', message: 'a folded posture requires an active display_feature', path: ['postures', i, 'display_feature'] });
      }
      if (feat && x.orientation && feat.unit === 'css_px') {
        const lg = p.logical.find((l) => l.panel === x.panel && l.orientation === x.orientation && l.unit === 'css_px');
        if (lg && (feat.bounds.x + feat.bounds.w > lg.w + 1 || feat.bounds.y + feat.bounds.h > lg.h + 1)) {
          ctx.addIssue({ code: 'custom', message: `display_feature "${feat.id}" bounds do not fit the ${x.orientation} logical size ${lg.w}x${lg.h} of panel ${x.panel}`, path: ['postures', i, 'orientation'] });
        }
      }
    });
    check(p.inputs.source_ref, ['inputs', 'source_ref']);
    if (p.keyboard_height) check(p.keyboard_height.source_ref, ['keyboard_height', 'source_ref']);
    p.operating_states.forEach((x, i) => check(x.source_ref, ['operating_states', i, 'source_ref']));
    const panelNames = new Set(p.panels.map((x) => x.name));
    p.logical.forEach((x, i) => {
      if (!panelNames.has(x.panel)) ctx.addIssue({ code: 'custom', message: `logical entry refers to undeclared panel "${x.panel}"`, path: ['logical', i, 'panel'] });
    });
    p.usable.forEach((x, i) => {
      if (!panelNames.has(x.panel)) ctx.addIssue({ code: 'custom', message: `usable entry refers to undeclared panel "${x.panel}"`, path: ['usable', i, 'panel'] });
    });
    for (const [name, arr] of [
      ['logical', p.logical],
      ['usable', p.usable],
    ] as const) {
      const seen = new Set<string>();
      arr.forEach((x, i) => {
        const k = `${x.panel}/${x.orientation}/${x.unit}`;
        if (seen.has(k)) ctx.addIssue({ code: 'custom', message: `duplicate ${name} entry for ${k}`, path: [name, i] });
        seen.add(k);
      });
    }
    if (p.logical.length === 0 && !p.unknowns.some((u) => u.field.startsWith('logical'))) {
      ctx.addIssue({ code: 'custom', message: 'a profile without logical sizes must list "logical" in unknowns with a reason', path: ['unknowns'] });
    }
    if (p.keyboard_height && p.keyboard_height.min > p.keyboard_height.max) {
      ctx.addIssue({ code: 'custom', message: 'keyboard_height.min must be ≤ max', path: ['keyboard_height'] });
    }
  });
export type Profile = z.infer<typeof Profile>;

/** Web-executable iff css_px logical + usable exist for at least one panel. */
export function executablePanels(p: Profile): PanelName[] {
  const out = new Set<PanelName>();
  for (const l of p.logical) {
    if (l.unit !== 'css_px') continue;
    if (p.usable.some((u) => u.panel === l.panel && u.unit === 'css_px')) out.add(l.panel);
  }
  return [...out];
}
export type PanelName = z.infer<typeof PanelName>;

// ---------- scenario ----------

export const Locator = z.string().min(1).describe('CSS selector, or role=<role>[name=<accessible name>]');

export const SetupAction = z.union([
  z.object({ goto: z.string() }).strict(),
  z.object({ click: Locator }).strict(),
  z.object({ fill: Locator, value: z.string() }).strict(),
  z.object({ type: Locator, value: z.string() }).strict(),
  z.object({ press: Locator, key: z.string() }).strict(),
  z.object({ check: Locator }).strict(),
  z.object({ selectOption: Locator, value: z.string() }).strict(),
  z.object({ focus: Locator, select: z.tuple([z.number().int(), z.number().int()]).optional() }).strict(),
  z.object({ scrollTo: Locator }).strict(),
  z.object({ play: Locator, seek: z.number().min(0).optional() }).strict(),
  z.object({ waitFor: Locator, state: z.enum(['visible', 'hidden', 'attached']).default('visible') }).strict(),
  z.object({ pushState: z.string() }).strict(),
  z.object({ wait: z.number().int().min(0).max(10_000) }).strict(),
  z.object({ evaluate: z.string() }).strict(),
]);
export type SetupAction = z.infer<typeof SetupAction>;

export const TransitionKind = z.enum(['fold', 'unfold', 'posture', 'rotate', 'resize', 'split', 'keyboard-open', 'keyboard-close']);
export type TransitionKind = z.infer<typeof TransitionKind>;

export const ConfigurationTarget = z
  .object({
    panel: PanelName.optional(),
    posture: PostureName.optional(),
    orientation: Orientation.optional(),
    viewport: Size.optional().describe('explicit CSS px viewport, for resize/split'),
    keyboard: z.object({ height: z.number().positive() }).strict().optional(),
  })
  .strict();
export type ConfigurationTarget = z.infer<typeof ConfigurationTarget>;

export const Transition = z
  .object({ kind: TransitionKind, to: ConfigurationTarget.default({}), note: z.string().optional() })
  .strict();
export type Transition = z.infer<typeof Transition>;

export const StatePolicies = z
  .object({
    form: z.union([z.literal('all'), z.literal('none'), z.array(Locator)]).default('all'),
    focus: z.enum(['same-element', 'none']).default('same-element'),
    selection: z.enum(['exact', 'none']).default('exact'),
    scroll: z.enum(['anchor', 'none']).default('anchor'),
    scroll_tolerance_px: z.number().min(0).default(0),
    storage: z.array(z.string()).default([]).describe('declared local/session storage keys; empty = not checked'),
    history: z.enum(['no-loss', 'none']).default('no-loss'),
    media: z.enum(['progress', 'none']).default('progress'),
    custom: z.string().optional().describe('JS expression evaluated in page returning JSON-serialisable state; deep-equal'),
  })
  .strict();
export type StatePolicies = z.infer<typeof StatePolicies>;

export const RuleId = z.enum([
  'env-self-check',
  'reachable',
  'state-preserved',
  'no-remount',
  'not-occluded-by-hinge',
  'straddles-fold-line',
  'no-element-loss',
  'fills-viewport',
  'operate',
  'no-horizontal-overflow',
  'target-size',
]);
export type RuleId = z.infer<typeof RuleId>;

export const PRESET_1: RuleId[] = ['reachable', 'state-preserved', 'no-remount', 'not-occluded-by-hinge', 'no-element-loss'];
export const STARTUP_RULES: RuleId[] = ['reachable', 'fills-viewport'];
export const STATIC_RULES: RuleId[] = ['no-horizontal-overflow', 'target-size'];

const AssertList = z.union([z.literal('preset@1'), z.array(RuleId.exclude(['env-self-check', 'operate', 'straddles-fold-line']))]);

export const SettlePolicy = z
  .object({
    quiet_frames: z.number().int().min(1).default(2),
    min_ms: z.number().int().min(0).default(0).describe('observe at least this long before accepting quiescence (catches debounced handlers)'),
    max_ms: z.number().int().min(100).default(3000),
  })
  .strict();
export type SettlePolicy = z.infer<typeof SettlePolicy>;

export const Step = z.union([
  z
    .object({
      transition: z.union([TransitionKind, Transition]),
      assert: AssertList.default('preset@1'),
      settle: SettlePolicy.partial().optional().describe('per-step override of the scenario settle policy'),
    })
    .strict(),
  z
    .object({
      operate: z
        .object({
          target: Locator,
          expect: z
            .object({
              visible: Locator.optional(),
              hidden: Locator.optional(),
              url: z.string().optional().describe('substring or regex /…/ the final URL must match'),
              text: z.object({ selector: Locator, contains: z.string() }).strict().optional(),
              custom: z.string().optional().describe('JS expression that must be truthy'),
            })
            .strict(),
        })
        .strict(),
    })
    .strict(),
]);
export type Step = z.infer<typeof Step>;

export const Scenario = z
  .object({
    $schema: z.string().optional(),
    foldproof: z.literal(1),
    id: z.string().regex(ID),
    title: z.string().min(1),
    profiles: z.union([z.array(z.string().regex(ID)).min(1), z.object({ class: z.enum(['foldable', 'phone', 'tablet', 'desktop', 'all']) }).strict()]),
    start: ConfigurationTarget.default({}),
    task: z
      .object({
        url: z.string().min(1).describe('absolute, or a path resolved against --base-url'),
        ready: z.object({ selector: Locator }).strict().optional(),
        controls: z.array(Locator).min(1).describe('each must resolve to exactly one element'),
        landmarks: z.array(Locator).default([]),
        state: StatePolicies.prefault({}),
        setup: z.array(SetupAction).default([]),
        script: z.string().optional().describe('ESM module exporting setup(page, ctx) for real apps'),
      })
      .strict(),
    steps: z.array(Step).default([]),
    settle: SettlePolicy.default({ quiet_frames: 2, min_ms: 0, max_ms: 3000 }),
    static: z.array(RuleId.extract(['no-horizontal-overflow', 'target-size'])).default([]),
    transient: z.array(Locator).default([]),
    mask: z.array(Locator).default([]).describe('selectors masked in screenshots'),
    expect: z
      .object({ verdict: z.enum(['pass', 'fail']).default('pass'), rules: z.array(RuleId).default([]) })
      .strict()
      .default({ verdict: 'pass', rules: [] }),
    tags: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.expect.verdict === 'fail' && s.expect.rules.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'expect.verdict fail requires expect.rules naming the rules that must fail', path: ['expect', 'rules'] });
    }
    if (s.expect.verdict === 'pass' && s.expect.rules.length > 0) {
      ctx.addIssue({ code: 'custom', message: 'expect.rules only applies to expect.verdict fail', path: ['expect', 'rules'] });
    }
  });
export type Scenario = z.infer<typeof Scenario>;

export function stepTransition(step: Step): Transition | null {
  if (!('transition' in step)) return null;
  return typeof step.transition === 'string' ? { kind: step.transition, to: {} } : step.transition;
}

export function stepRules(step: Step): RuleId[] {
  if ('operate' in step) return ['operate'];
  return step.assert === 'preset@1' ? PRESET_1 : step.assert;
}
