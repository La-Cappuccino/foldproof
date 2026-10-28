# Third-party notices

foldproof's own code is Apache-2.0 (`LICENSE`); its profile corpus is CDLA-Permissive-2.0 (`profiles/LICENSE`).
The material below is included or derived from third parties and keeps its original terms.

## Data included in the repository and the npm package

### Chrome DevTools emulated device descriptors (BSD-3-Clause)
Source: `front_end/models/emulation/EmulatedDevices.ts`, https://chromium.googlesource.com/devtools/devtools-frontend
(main, commit 8960558, inspected 2026-10-28). Values (CSS sizes, pixel ratios, hinge rectangles) are quoted in
`profiles/*.json` with `source_ref` entries naming this registry.

```
Copyright 2014 The Chromium Authors. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

   * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
   * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Playwright device descriptors (Apache-2.0)
Source: `packages/isomorphic/deviceDescriptorsSource.json`, https://github.com/microsoft/playwright (main, commit
f9a841f, inspected 2026-10-28). A verbatim snapshot is kept at
`scripts/data/playwright-deviceDescriptorsSource-2026-10-28.json` so the corpus regenerates deterministically.

```
Copyright (c) Microsoft Corporation.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for
the specific language governing permissions and limitations under the License.
```

### Android Open Source Project SDK device definitions (Apache-2.0)
Source: `devices.xml`, `nexus.xml`, `tv.xml`, `automotive.xml` under
https://android.googlesource.com/platform/tools/base (mirror-goog-studio-main, commit b143674a, inspected 2026-10-28).
Copyright (C) The Android Open Source Project. Licensed under the Apache License, Version 2.0 (same text as above).

### MDN browser-compat-data (CC0-1.0)
Source: https://github.com/mdn/browser-compat-data v8.1.7. `engines/web-capabilities.json` is generated from it.
Dedicated to the public domain under CC0 1.0 Universal.

### Vendor technical specifications
Short factual quotations (screen sizes, resolutions, pixel densities) from Apple, Google, Samsung, Microsoft,
OnePlus and LG product pages, cited with URL and inspection date in each profile (`licence: "vendor-fact"`).
Facts are not copyrightable; no page content is reproduced beyond the quoted values.

### Standards documents
W3C Device Posture API, Viewport Segments / CSS Environment Variables (W3C Document Licence), WCAG 2.2, EN 301 549,
Google adaptive app quality guidelines, Apple Human Interface Guidelines: referenced by URL, not reproduced.

## Runtime dependencies (not vendored; installed from npm)

| Package | Licence |
|---|---|
| zod | MIT |
| commander | MIT |
| yaml | ISC |
| @axe-core/playwright, axe-core | MPL-2.0 (used unmodified as a dependency; MPL's file-level terms apply to axe-core's own files only) |
| playwright (peer dependency) | Apache-2.0 |
