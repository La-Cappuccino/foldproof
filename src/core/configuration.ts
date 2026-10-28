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
  /** what CDP screenOrientation was set to (the device's physical orientation) */
  screenOrientation: 'portrait' | 'landscape';
  /** what `(orientation: …)` evaluates to for the layout viewport (a split window can differ from the screen) */
  cssOrientation: 'portrait' | 'landscape';
}

export interface DisplayFeatureEmulation {
  orientation: 'vertical' | 'horizontal';
  offset: number;
  maskLength: number;
  occlusion: 'none' | 'full';
  /** true when derived by rotating the profile's feature with the panel (no registry entry for this orientation) */
  rotated?: boolean;
}

export interface ResolvedConfiguration {
  profileId: string;
  profileRevision: number;
  panel: PanelName;
  orientation: Orientation;
  posture: PostureName | null;
  /** CSS px layout viewport before any keyboard approximation */
  viewport: { w: number; h: number };
  /** an explicit viewport set by resize/split; carried across keyboard transitions on the same panel/orientation */
  explicitViewport: { w: number; h: number } | null;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  displayFeature: DisplayFeatureEmulation | null;
  webPosture: 'continuous' | 'folded';
  expectedSegments: 1 | 2;
  keyboard: { height: number } | null;
  inputs: { pointer: 'fine' | 'coarse' | 'none'; hover: 'hover' | 'none' };
  sourceRefs: string[];
  gaps: string[];
}

export interface ResolveError {
  error: string;
  notExecutable?: boolean;
}

export function isResolveError(r: ResolvedConfiguration | ResolveError): r is ResolveError {
  return 'error' in r;
}

export function resolveConfiguration(profile: Profile, target: ConfigurationTarget, previous?: ResolvedConfiguration): ResolvedConfiguration | ResolveError {
  const gaps: string[] = [];
  const sourceRefs = new Set<string>();

  const postureOwner = target.posture && !target.panel ? profile.postures.find((p) => p.name === target.posture)?.panel : undefined;
  const panel: PanelName = target.panel ?? postureOwner ?? previous?.panel ?? (profile.panels.length === 1 ? profile.panels[0]!.name : 'inner');
  if (!profile.panels.some((p) => p.name === panel)) return { error: `profile ${profile.id} has no panel "${panel}"` };

  const posture: PostureName | null = target.posture ?? (target.panel && target.panel !== previous?.panel ? null : previous?.posture ?? null);
  const postureDef = posture ? profile.postures.find((p) => p.name === posture) : undefined;
  if (posture && !postureDef) return { error: `profile ${profile.id} declares no posture "${posture}"` };
  if (postureDef && postureDef.panel !== panel) return { error: `posture "${posture}" belongs to panel "${postureDef.panel}", not "${panel}"` };

  const logicalForPanel = profile.logical.filter((l) => l.panel === panel && l.unit === 'css_px');
  if (logicalForPanel.length === 0) return { error: `profile ${profile.id} has no css_px logical size for panel "${panel}"`, notExecutable: true };

  const samePanel = previous?.panel === panel;
  const samePosture = samePanel && previous!.posture === posture;
  // orientation: explicit → (unchanged panel+posture) previous → the posture's declared orientation → (same panel) previous → first entry
  const orientation: Orientation = target.orientation ?? (samePosture ? previous!.orientation : postureDef?.orientation ?? (samePanel ? previous!.orientation : logicalForPanel[0]!.orientation));
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
  const sameFrame = samePanel && previous!.orientation === orientation;
  const explicitViewport = target.viewport ? { w: target.viewport.w, h: target.viewport.h } : sameFrame ? (previous!.explicitViewport ?? null) : null;
  let viewport: { w: number; h: number };
  if (explicitViewport) {
    viewport = { ...explicitViewport };
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

  let displayFeature: DisplayFeatureEmulation | null = null;
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
        const native: DisplayFeatureEmulation =
          feat.orientation === 'vertical'
            ? { orientation: 'vertical', offset: feat.bounds.x, maskLength: feat.bounds.w, occlusion: feat.occlusion }
            : { orientation: 'horizontal', offset: feat.bounds.y, maskLength: feat.bounds.h, occlusion: feat.occlusion };
        // the feature is published in the posture's orientation; if the panel is rotated, the same physical
        // hinge becomes the other axis at the same offset (a vertical hinge at x=540 of a landscape span is a
        // horizontal hinge at y=540 of the portrait span)
        // registries publish a feature in the panel's natural (first published) orientation unless the posture says otherwise
        const nativeOrientation: Orientation = postureDef.orientation ?? logicalForPanel[0]!.orientation;
        if (nativeOrientation !== orientation) {
          displayFeature = { ...native, orientation: native.orientation === 'vertical' ? 'horizontal' : 'vertical', rotated: true };
          gaps.push(`display feature ${feat.id} rotated with the panel from ${nativeOrientation} to ${orientation} (derived: same offset ${native.offset}, same mask ${native.maskLength})`);
        } else {
          displayFeature = native;
        }
        // sanity: the feature must fit the viewport along its axis
        const extent = displayFeature.orientation === 'vertical' ? viewport.w : viewport.h;
        if (displayFeature.offset + displayFeature.maskLength > extent + 1) {
          gaps.push(`display feature ${feat.id} (${displayFeature.orientation} at ${displayFeature.offset}+${displayFeature.maskLength}) does not fit the ${viewport.w}x${viewport.h} viewport; emulating without segments`);
          displayFeature = null;
          expectedSegments = 1;
        }
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
    explicitViewport,
    deviceScaleFactor: logical.scale,
    isMobile: coarse && profile.inputs.touch,
    hasTouch: profile.inputs.touch,
    displayFeature,
    webPosture,
    expectedSegments: displayFeature ? 2 : 1,
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
    screenOrientation: cfg.orientation,
    cssOrientation: vp.w > vp.h ? 'landscape' : 'portrait', // CSS: landscape iff width > height; square is portrait
  };
}

export function applyTransition(profile: Profile, current: ResolvedConfiguration, transition: Transition): ResolvedConfiguration | ResolveError {
  const to: ConfigurationTarget = { ...transition.to };
  switch (transition.kind) {
    case 'fold': {
      if (!to.posture) {
        const closed = profile.postures.find((p) => p.name === 'closed' && (!to.panel || p.panel === to.panel));
        const half = profile.postures.find((p) => p.name === 'half_opened' && p.panel === (to.panel ?? current.panel));
        const pick = closed ?? half;
        if (!pick) return { error: `fold: profile ${profile.id} declares no closed or half_opened posture${to.panel ? ` on panel ${to.panel}` : ''}` };
        to.posture = pick.name;
        to.panel = pick.panel;
      }
      break;
    }
    case 'unfold': {
      if (!to.posture) {
        const flats = profile.postures.filter((p) => p.name === 'flat' && (!to.panel || p.panel === to.panel));
        const pick = flats.find((p) => p.panel === 'inner') ?? flats[0];
        if (!pick) return { error: `unfold: profile ${profile.id} declares no flat posture${to.panel ? ` on panel ${to.panel}` : ''}` };
        to.posture = 'flat';
        to.panel = pick.panel;
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
    case 'keyboard-close':
      return resolveConfiguration(profile, { ...to, keyboard: undefined }, { ...current, keyboard: null });
  }
  return resolveConfiguration(profile, to, current);
}
