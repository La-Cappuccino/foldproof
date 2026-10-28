/**
 * Resolve (profile, configuration target) into the concrete emulation the adapter applies, plus the
 * observable signals the environment self-check must see afterwards. Pure; unit-tested.
 */
import type { Profile, PanelName, PostureName, Orientation, ConfigurationTarget, Transition } from './schema.js';

export interface ExpectedSignals {
  innerWidth: number;
  innerHeight: number;
  dpr: number;
  cssPosture: 'continuous' | 'folded';
  segments: 1 | 2;
  segmentRects: { x: number; y: number; w: number; h: number }[] | null;
  orientation: 'portrait' | 'landscape';
}

export interface ResolvedConfiguration {
  profileId: string;
  profileRevision: number;
  panel: PanelName;
  orientation: Orientation;
  posture: PostureName | null;
  /** CSS px layout viewport before any keyboard approximation */
  viewport: { w: number; h: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  displayFeature: { orientation: 'vertical' | 'horizontal'; offset: number; maskLength: number; occlusion: 'none' | 'full' } | null;
  webPosture: 'continuous' | 'folded';
  expectedSegments: 1 | 2;
  /** requested soft keyboard; the adapter chooses the approximation and reports it */
  keyboard: { height: number } | null;
  inputs: { pointer: 'fine' | 'coarse' | 'none'; hover: 'hover' | 'none' };
  sourceRefs: string[];
  /** anything the profile could not supply; surfaces in the report */
  gaps: string[];
}

export interface ResolveError {
  error: string;
  /** true when the profile simply is not executable on the web adapter (→ notApplicable) */
  notExecutable?: boolean;
}

export function isResolveError(r: ResolvedConfiguration | ResolveError): r is ResolveError {
  return 'error' in r;
}

export function resolveConfiguration(profile: Profile, target: ConfigurationTarget, previous?: ResolvedConfiguration): ResolvedConfiguration | ResolveError {
  const gaps: string[] = [];
  const sourceRefs = new Set<string>();

  const panel: PanelName = target.panel ?? previous?.panel ?? (profile.panels.length === 1 ? profile.panels[0]!.name : 'inner');
  if (!profile.panels.some((p) => p.name === panel)) return { error: `profile ${profile.id} has no panel "${panel}"` };

  const posture: PostureName | null = target.posture ?? (target.panel && target.panel !== previous?.panel ? null : previous?.posture ?? null);
  const postureDef = posture ? profile.postures.find((p) => p.name === posture) : undefined;
  if (posture && !postureDef) return { error: `profile ${profile.id} declares no posture "${posture}"` };
  if (postureDef && postureDef.panel !== panel) return { error: `posture "${posture}" belongs to panel "${postureDef.panel}", not "${panel}"` };

  const logicalForPanel = profile.logical.filter((l) => l.panel === panel && l.unit === 'css_px');
  if (logicalForPanel.length === 0) {
    return { error: `profile ${profile.id} has no css_px logical size for panel "${panel}"`, notExecutable: true };
  }
  const orientation: Orientation = target.orientation ?? previous?.orientation ?? logicalForPanel[0]!.orientation;
  let logical = logicalForPanel.find((l) => l.orientation === orientation);
  let swapped = false;
  if (!logical) {
    const other = logicalForPanel[0]!;
    logical = { ...other, orientation, w: other.h, h: other.w, kind: 'derived', derivation: `swap of ${other.orientation} ${other.w}x${other.h}` };
    swapped = true;
    gaps.push(`no published ${orientation} size for panel ${panel}; derived by swapping ${other.orientation}`);
  }
  sourceRefs.add(logical.source_ref);

  const usable = profile.usable.find((u) => u.panel === panel && u.orientation === orientation && u.unit === 'css_px');
  let viewport: { w: number; h: number };
  if (target.viewport) {
    viewport = { w: target.viewport.w, h: target.viewport.h };
  } else if (usable) {
    viewport = { w: usable.layout_viewport.w, h: usable.layout_viewport.h };
    sourceRefs.add(usable.source_ref);
  } else {
    const anyUsable = profile.usable.some((u) => u.panel === panel && u.unit === 'css_px');
    if (!anyUsable) return { error: `profile ${profile.id} has no css_px usable viewport for panel "${panel}"`, notExecutable: true };
    viewport = { w: logical.w, h: logical.h };
    gaps.push(`usable viewport for ${panel}/${orientation} not published; using logical size ${logical.w}x${logical.h}${swapped ? ' (swapped)' : ''} (browser UI height unknown)`);
  }

  const keyboard = target.keyboard ? { height: target.keyboard.height } : previous?.keyboard ?? null;

  let displayFeature: ResolvedConfiguration['displayFeature'] = null;
  let webPosture: 'continuous' | 'folded' = 'continuous';
  let expectedSegments: 1 | 2 = 1;
  if (postureDef) {
    sourceRefs.add(postureDef.source_ref);
    webPosture = postureDef.web.posture;
    expectedSegments = postureDef.web.segments;
    const feat = postureDef.display_feature ? profile.display_features.find((f) => f.id === postureDef.display_feature) : undefined;
    if (feat) {
      if (feat.unit !== 'css_px') {
        gaps.push(`display feature ${feat.id} is in ${feat.unit}, not css_px; cannot emulate hinge geometry`);
        expectedSegments = 1;
      } else {
        sourceRefs.add(feat.source_ref);
        displayFeature =
          feat.orientation === 'vertical'
            ? { orientation: 'vertical', offset: feat.bounds.x, maskLength: feat.bounds.w, occlusion: feat.occlusion }
            : { orientation: 'horizontal', offset: feat.bounds.y, maskLength: feat.bounds.h, occlusion: feat.occlusion };
      }
    }
  }

  sourceRefs.add(profile.inputs.source_ref);
  const coarse = profile.inputs.pointer === 'coarse';
  return {
    profileId: profile.id,
    profileRevision: profile.revision,
    panel,
    orientation,
    posture,
    viewport,
    deviceScaleFactor: logical.scale,
    isMobile: coarse && profile.inputs.touch,
    hasTouch: profile.inputs.touch,
    displayFeature,
    webPosture,
    expectedSegments,
    keyboard,
    inputs: { pointer: profile.inputs.pointer, hover: profile.inputs.hover },
    sourceRefs: [...sourceRefs],
    gaps,
  };
}

/** The signals the adapter must observe after applying `cfg` (keyboard approximation applied separately). */
export function expectedSignals(cfg: ResolvedConfiguration, effectiveViewport?: { w: number; h: number }): ExpectedSignals {
  const vp = effectiveViewport ?? cfg.viewport;
  let segmentRects: ExpectedSignals['segmentRects'] = null;
  if (cfg.displayFeature) {
    const f = cfg.displayFeature;
    segmentRects =
      f.orientation === 'vertical'
        ? [
            { x: 0, y: 0, w: f.offset, h: vp.h },
            { x: f.offset + f.maskLength, y: 0, w: vp.w - f.offset - f.maskLength, h: vp.h },
          ]
        : [
            { x: 0, y: 0, w: vp.w, h: f.offset },
            { x: 0, y: f.offset + f.maskLength, w: vp.w, h: vp.h - f.offset - f.maskLength },
          ];
  }
  return {
    innerWidth: vp.w,
    innerHeight: vp.h,
    dpr: cfg.deviceScaleFactor,
    cssPosture: cfg.webPosture,
    segments: cfg.displayFeature ? 2 : 1,
    segmentRects,
    orientation: vp.w >= vp.h ? 'landscape' : 'portrait',
  };
}

export function applyTransition(profile: Profile, current: ResolvedConfiguration, transition: Transition): ResolvedConfiguration | ResolveError {
  const to: ConfigurationTarget = { ...transition.to };
  switch (transition.kind) {
    case 'fold': {
      if (!to.panel) to.panel = profile.panels.some((p) => p.name === 'outer') ? 'outer' : current.panel;
      if (!to.posture) {
        const closed = profile.postures.find((p) => p.name === 'closed' && p.panel === to.panel);
        const half = profile.postures.find((p) => p.name === 'half_opened' && p.panel === to.panel);
        to.posture = closed?.name ?? half?.name;
        if (!to.posture) return { error: `fold: profile ${profile.id} declares no closed/half_opened posture on panel ${to.panel}` };
      }
      break;
    }
    case 'unfold': {
      if (!to.panel) to.panel = profile.panels.some((p) => p.name === 'inner') ? 'inner' : current.panel;
      if (!to.posture) {
        const flat = profile.postures.find((p) => p.name === 'flat' && p.panel === to.panel);
        if (!flat) return { error: `unfold: profile ${profile.id} declares no flat posture on panel ${to.panel}` };
        to.posture = 'flat';
      }
      break;
    }
    case 'posture':
      if (!to.posture) return { error: 'posture transition requires to.posture' };
      break;
    case 'rotate':
      if (!to.orientation) to.orientation = current.orientation === 'portrait' ? 'landscape' : 'portrait';
      break;
    case 'resize':
    case 'split':
      if (!to.viewport) return { error: `${transition.kind} requires to.viewport { w, h }` };
      break;
    case 'keyboard-open':
      if (!to.keyboard) {
        if (profile.keyboard_height) to.keyboard = { height: profile.keyboard_height.max };
        else return { error: `keyboard-open requires to.keyboard.height (profile ${profile.id} has no sourced keyboard_height)` };
      }
      break;
    case 'keyboard-close': {
      const r = resolveConfiguration(profile, { ...to, keyboard: undefined }, { ...current, keyboard: null });
      return r;
    }
  }
  return resolveConfiguration(profile, to, current);
}
