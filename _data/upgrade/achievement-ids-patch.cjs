const fs=require('fs'),crypto=require('crypto');
const file='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/成就界面.prefab';
const original=fs.readFileSync(file,'utf8'),data=JSON.parse(original),seen=new Set();
for(const o of data){if(!o.fileId)continue;if(seen.has(o.fileId))o.fileId=crypto.randomBytes(16).toString('base64').replace(/=/g,'');seen.add(o.fileId);}
const ids=data.filter(o=>o.fileId).map(o=>o.fileId);let index=0;
const hunks=original.split(/\r?\n/).filter(l=>l.includes('"fileId":')).map(l=>'@@\n-'+l+'\n+'+l.replace(/("fileId": ")[^"]+(".*)/,'$1'+ids[index++]+'$2'));
console.log('*** Begin Patch\n*** Update File: '+file+'\n'+hunks.join('\n')+'\n*** End Patch');
