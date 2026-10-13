const fs=require('fs');
// Reuse the isolated snow-map preview boot, then run freeze-specific runtime assertions.
const boot=fs.readFileSync('_data/upgrade/preview-snow-prayer.cjs','utf8').split("  console.log('entry'")[0];
new Function('require',boot+fs.readFileSync('_data/upgrade/ice-butterfly-checks.inc.cjs','utf8'))(require);
