// Centralized structured logger for server-side code (API routes,
// admin helpers). Emits single-line JSON so log lines are easy to
// grep/filter in Vercel's log viewer or any log aggregator.
//
// This intentionally does NOT wire up Sentry or any other APM out of
// the box — that requires an external account/DSN this codebase
// doesn't have credentials for. To add real error tracking later:
//   1. `npm install @sentry/nextjs` and run `npx @sentry/wizard@latest -i nextjs`
//   2. Set the `SENTRY_DSN` env var in Vercel
//   3. In the `error()` function below, call `Sentry.captureException`
//      when `process.env.SENTRY_DSN` is set.
// Until then, this at least makes production errors structured and
// consistently searchable instead of scattered plain-text console.error calls.

type LogContext = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
