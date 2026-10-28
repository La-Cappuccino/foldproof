import type { Command } from 'commander';

/**
 * Registers `run`, `fixtures`, `report` and `doctor`. Filled in by the web adapter slice.
 */
export function registerRunCommands(program: Command): void {
  program
    .command('doctor')
    .description('check Playwright, Chromium and whether fold emulation is honoured')
    .action(async () => {
      const { doctor } = await import('../adapters/web/doctor.js');
      const report = await doctor();
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.ok ? 0 : 1);
    });
}
