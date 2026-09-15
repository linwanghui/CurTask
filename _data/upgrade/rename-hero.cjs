const fs=require('fs');
const paths=JSON.parse(fs.readFileSync('_data/upgrade/fragment-changed.json'));
let patch='*** Begin Patch\n';
for(const p of paths){
 const old=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const next=old.replaceAll('角色碎片','英雄碎片').replaceAll('RoleFragments','HeroFragments').replaceAll('RoleFragmentClaim','HeroFragmentClaim').replaceAll('receivedRoleFragments','receivedHeroFragments');
 if(old===next)continue;
 patch+='*** Update File: '+p+'\n';
 const before=old.split('\n'),after=next.split('\n');
 for(let i=0;i<before.length;i++)if(before[i]!==after[i])patch+='@@\n-'+before[i]+'\n+'+after[i]+'\n';
}
process.stdout.write(patch+'*** End Patch');
