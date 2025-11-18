# SecureSync SBOM Integration Plan

## Current Architecture Snapshot
- **Scanner layer (`src/scanner`)** builds dependency trees from `package.json`/`package-lock.json`, enriches npm audit data, and emits `ScanResult` models used across CLI/API.
- **Analyzer (`src/analyzer`)** inspects semver deltas, changelog entries, and API diffs to flag breaking changes ahead of upgrades.
- **Remediation (`src/remediation`)** generates migration scripts, executes test-driven updates, and coordinates rollback logic.
- **Alternatives & Graph modules** surface replacement packages and visualize dependency relationships for reporting/UX.
- **CLI (`src/cli`)** wraps the modules with commands (`scan`, `fix`, `analyze`, `alternatives`, `migrate`) and consistent terminal UX via `ui.ts`.

These layers already manage rich dependency metadata and vulnerability context that can seed Software Bill of Materials (SBOM) generation and downstream compliance workflows.

## SBOM Best Practices & Standards
1. **Format coverage**: Support at least CycloneDX v1.5 JSON (widely adopted across application security tooling) and optionally SPDX 2.3 for supply-chain mandates (e.g., US federal EO 14028, EU CRA).
2. **Provenance metadata**: Capture build environment, package manager, data sources, and timestamp fields to satisfy NTIA minimum SBOM elements.
3. **Component fidelity**: Include purl identifiers (`pkg:npm/<name>@<version>`), licenses, dependency relationships (`dependsOn`), and cryptographic hashes when available.
4. **Integrity & signing**: Provide hooks for future attestation/signing (Sigstore, in-toto) even if signing is out-of-scope for v1.
5. **Automation & lifecycle**: Generate SBOM artifacts during CI for every release, store as build artifacts, and attach to releases/registries.
6. **Versioning**: Maintain history per build to enable diffing SBOMs and triggering delta-based alerts.

## SBOM Formats Overview
- **CycloneDX** (OWASP): Purpose-built for application security, 1.5 adds services metadata, dependency graphs, VEX. Best option for SecureSync due to security-first semantics and strong tooling (CycloneDX CLI, cyclonedx-bom, Dependency-Track compatibility).
- **SPDX** (Linux Foundation): Compliance-heavy schema, ideal for license reporting. Useful for customers needing SPDX-only ingestion (DoD, automotive). Implementation can start with Document + Package + Relationship primitives and expand later.

## Tooling Landscape (Generation & Scanning)
- **Generation Tools**: Anchore Syft, OWASP CycloneDX CLI, SPDX SBOM Tool, paketo `cnb2sbom`, npm `sbom` exp. Selected approach: native generation via `@cyclonedx/cyclonedx-library` for tight integration, with optional external tool invocation later.
- **Vulnerability Mapping**: Feed SBOMs into Grype, Trivy, Dependency-Track, or OWASP Dependency-Track server for continuous monitoring. SecureSync already surfaces vulnerabilities; we will embed them into CycloneDX `vulnerabilities` section and expose JSON for interoperability.
- **Scanning Services**: OSV, NVD, npm audit, GitHub Advisory DB. Continue leveraging existing data while enabling SBOM export for third-party scanners.

## Compliance & Reporting Considerations
- **Executive Order 14028 / NIST SSDF**: Requires SBOM availability, tamper-proof storage, and documented generation process.
- **NTIA Minimum Elements**: Supplier, component, version, dependency relationship, author, timestamp, distribution. Plan ensures fields exist.
- **FedRAMP / DoD**: Prefer SPDX; requirement to provide vulnerability disclosure w/ CVSS + remediation guidance.
- **EU Cyber Resilience Act**: Focus on lifecycle updates—tie SBOM updates to patch releases and notify users via reporting hooks.

## Proposed Integration Architecture
1. **SBOM Module (`src/sbom/`)**
   - `generator.ts`: Converts `DependencyTree` into CycloneDX (default) or SPDX JSON; supports options for format, includeDevDeps, attach vulnerabilities.
   - `scanner.ts`: Orchestrates optional vulnerability scan (reuse `scanNpmProject`) and merges results into SBOM `vulnerabilities` block.
   - `types.ts`: Shared interfaces (`SbomFormat`, `SbomOptions`, `SbomDocument`).
2. **CLI Command (`securesync sbom`)**
   - Options: `--format cyclonedx|spdx`, `--output <file|stdout>`, `--include-dev`, `--attach-vulns`, `--fail-on <severity>`, `--upload <url>` (future hook), `--json`.
   - Reuses spinner UI; prints summary plus artifact path.
3. **Programmatic API**
   - Export `generateSbom` + types via `src/index.ts` for embedding in other tools/CI scripts.
4. **Reporting & Alerting**
   - Extend `ui.ts` with SBOM summary renderer (component count, vulnerabilities, format, file path).
   - Provide JSON output for automation plus optional table summary.
5. **Configuration**
   - `.securesyncrc` gains `sbom` section (format default, attach vulnerabilities, outputDir) for CI-friendly defaults.

## Workflow Design
1. **Generation Flow**
   - Build dependency tree → map to `Component` objects (name, version, purl, scope) → append metadata (hashes if `package-lock` provides) → write CycloneDX JSON.
   - Support `spdx` by synthesizing Document + Packages + Relationships using same source data.
2. **Vulnerability Enrichment**
   - Optional `scan` step executed first to reuse vulnerability array. Map each vulnerability to CycloneDX `vulnerabilities` referencing component `bom-ref`.
3. **CI/CD Integration**
   - Add npm script `sbom` invoking `securesync sbom --format cyclonedx --attach-vulns --output sbom.cdx.json`.
   - Example GitHub Action job storing SBOM artifact and optionally uploading to Dependency-Track or GitHub Advanced Security.
   - Document GitLab/Jenkins recipes mirroring existing scan job layout.
4. **Reporting Pipelines**
   - Provide `--report <path>` option to emit human-readable summary (Markdown/JSON). Future: integrate with `remediation` for auto ticketing.

## Verification Strategy
- **Unit Tests**: Cover generator conversions (component mapping, dev dependency inclusion, vulnerability attachments) and CLI command behavior (argument parsing, JSON output, fail-on logic).
- **Integration Tests**: Use `tests/fixtures/package.json` to generate deterministic SBOM snapshots validated via JSON schema fragments.
- **Manual CI Checks**: Validate `securesync sbom` within GitHub Actions preview workflow and ensure artifacts upload.

## Next Steps
1. Implement SBOM module + exports.
2. Wire up CLI command and config handling.
3. Add documentation (`README`, `PUBLISHING`, examples) plus sample CI snippet.
4. Create tests covering generator + CLI.
5. Provide follow-up roadmap for signing and Dependency-Track push integration.
