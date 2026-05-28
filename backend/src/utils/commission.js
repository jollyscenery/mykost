const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.10');

function calculateCommission(grossAmount) {
  const commission = Math.round(grossAmount * PLATFORM_COMMISSION_RATE);
  const netAmount = grossAmount - commission;
  return { grossAmount, commission, netAmount, rate: PLATFORM_COMMISSION_RATE };
}

module.exports = { calculateCommission, PLATFORM_COMMISSION_RATE };
