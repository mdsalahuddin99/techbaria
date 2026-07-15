const { ledgerService } = require('./apps/dashboard/src/server/services/accounts/ledgerService');

async function main() {
  const ledger = await ledgerService.listLedger({});
  const drawerTxs = ledger.filter(l => l.accountId === 'cmrjc3cu30001i904cp2lnxiz');
  console.log(drawerTxs);
  if (drawerTxs.length > 0) {
    console.log("Current Ledger Computed Balance:", drawerTxs[0].balanceAfter); // Because it is reversed, index 0 is newest
  }
}
main().catch(console.error);
