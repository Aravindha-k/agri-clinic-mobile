# Legacy UI guidance

The active field application uses the V2 surfaces under `mobile/app` and shared components under
`mobile/components`. Code under `src/screens` is legacy unless it is still reached from the active
navigator (for example Settings).

## Change rules

- Build new UI with `mobile/lib/theme.ts` and existing V2 shared components.
- Do not copy legacy screen styles into V2 or create a second component kit.
- Before editing `src/screens`, verify that the screen is registered in active navigation.
- Keep active legacy screens as thin consumers of V2 layout and UI components.
- Do not add dark-mode controls until all active V2 surfaces have complete dark tokens and QA.
- Interactive controls must expose a role and localized label/state where applicable, and provide
  at least a 48dp touch target.
- Shared animation must honor the system reduced-motion preference through `usePremiumMotion`.

## Launcher assets

The launcher label remains `Kavya Agri`. Generate launcher artwork only with
`node scripts/generate-kac-app-icons.mjs`; splash artwork has a separate pipeline and must not be
changed during launcher updates.
