import { sys } from 'cc';
import { ZRSJZ_GUN_CAST_CONFIG as C } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
export class ZRSJZ_GunCastService {
 static readonly key = 'ZRSJZ_GunCast_v1';
 static load(): any { try { return JSON.parse(sys.localStorage.getItem(this.key)) || {date:'',seen:[]}; } catch { return {date:'',seen:[]}; } }
 static save(d:any) { sys.localStorage.setItem(this.key,JSON.stringify(d)); }
 static today() { const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
 static free() { return this.load().date !== this.today(); }
 static enter(free:boolean):string { const d=this.load(); if(d.round)return ''; if(free&&!this.free())return '今日免费次数已用完'; if(!free&&ZRSJZ_GameData.Instance.Gold<C.entryCost)return '钞票不足';
 if(!free)ZRSJZ_AccountService.ChangeGold(-C.entryCost); d.date=this.today(); d.round={id:Date.now()+Math.random(),level:0,branch:0,hits:0,superUntil:0,broken:false,recovered:false,ads:0}; d.seen=d.seen||[];if(!d.seen.includes('0'))d.seen.push('0');this.save(d);return ''; }
 static hit(random=Math.random, now=Date.now()) { const d=this.load(), r=d.round;if(!r||r.broken||r.level>=12)return -1;
 if(r.superUntil&&now>=r.superUntil){r.superUntil=0;r.hits=0;}
 const probs=C.probabilities[r.level];let n=random()*100,result=4;for(let i=0;i<5;i++){n-=probs[i];if(n<0){result=i;break;}}
 const protectedHit=r.superUntil>now;
 if(result===0)r.level=Math.min(12,r.level+2);else if(result===1)r.level++;else if(!protectedHit&&result===3)r.level=Math.max(0,r.level-1);else if(!protectedHit&&result===4)r.broken=true;
 if(r.level===12)r.branch=Math.min(2,Math.floor(random()*3));
 const seen=r.level===12?'12:'+r.branch:String(r.level);if(!d.seen.includes(seen))d.seen.push(seen);
 if(!protectedHit&&!r.broken&&++r.hits>=C.superHits){r.superUntil=now+C.superDuration*1000;}
 this.save(d);return result; }
 static recover() {const d=this.load(),r=d.round;if(!r?.broken||r.recovered)return; if(++r.ads>=C.recoveryAds){r.broken=false;r.recovered=true;}this.save(d);}
 static item(r:any) {return r.level===12?C.branches[r.branch].item:C.weapons[r.level];}
 static finish(){const d=this.load();delete d.round;this.save(d);}
}
