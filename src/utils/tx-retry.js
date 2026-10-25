// Shared Prisma interactive-transaction runner with retry.
//
// Long-ish transactions under MySQL can occasionally fail with:
//   P2028 – "Transaction API timed out" (engine not responsive in time)
//   P2034 – "Transaction failed: write conflict" (row lock / deadlock)
// Both are transient — retrying the whole transaction is safe because every
// step runs inside the same tx and any failed attempt is rolled back.
const RETRYABLE_TX_CODES = new Set(["P2028", "P2034"]);

const TX_OPTIONS = { maxWait: 5000, timeout: 15000 };

/**
 * Runs `fn(tx)` via `prisma.$transaction` with a longer timeout than the
 * Prisma default and retries transient conflict/timeout errors.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {function} fn async (tx) => result
 * @param {number} attempts maximum attempts (default 3)
 */
async function withTransactionRetry(prisma, fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await prisma.$transaction(fn, TX_OPTIONS);
    } catch (err) {
      lastError = err;
      if (!RETRYABLE_TX_CODES.has(err?.code) || i === attempts - 1) throw err;
      // Brief backoff before the next attempt.
      await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)));
    }
  }
  // Unreachable, kept for safety.
  throw lastError;
}

module.exports = { withTransactionRetry, RETRYABLE_TX_CODES, TX_OPTIONS };
