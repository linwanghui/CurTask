import { sys } from 'cc';
import { ZRSJZ_GUN_CAST_CONFIG as C } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
export type ZRSJZ_GunCastItemKind = '铸枪护盾' | '铸枪必成券';
export class ZRSJZ_GunCastService {
 static readonly itemKinds: readonly ZRSJZ_GunCastItemKind[] = ['铸枪护盾','铸枪必成券'];
 static isCastItem(name:string):name is ZRSJZ_GunCastItemKind { return this.itemKinds.includes(name as ZRSJZ_GunCastItemKind); }
 static itemCount(kind:ZRSJZ_GunCastItemKind):number { const count=ZRSJZ_GameData.Instance.GunCastItems?.[kind];return Number.isSafeInteger(count)&&count>=0?count:0; }
 static creditItem(kind:ZRSJZ_GunCastItemKind,count:number,save=true):boolean {
  if(!this.isCastItem(kind)||!Number.isSafeInteger(count)||count<=0||!Number.isSafeInteger(this.itemCount(kind)+count))return false;
  const data=ZRSJZ_GameData.Instance;data.GunCastItems??={};data.GunCastItems[kind]=this.itemCount(kind)+count;
  if(save)ZRSJZ_GameData.SaveData();return true;
 }
 static itemEffect(kind:ZRSJZ_GunCastItemKind):boolean { return ZRSJZ_GameData.Instance.GunCastItemEffects?.[kind]===true; }
 static useItem(kind:ZRSJZ_GunCastItemKind):string {
  const d=this.load(),r=d.round;
  if(!this.isCastItem(kind))return '道具无效';
  if(!r||r.broken||r.level>=12)return '当前无法使用铸枪道具';
  if(this.itemEffect(kind)||(kind==='铸枪必成券'&&d.nextHitSuccess))return '效果已生效，无需重复使用';
  if(this.itemCount(kind)<=0)return '道具数量不足';
  const data=ZRSJZ_GameData.Instance;data.GunCastItems[kind]=this.itemCount(kind)-1;
  data.GunCastItemEffects??={};data.GunCastItemEffects[kind]=true;ZRSJZ_GameData.SaveData();return '';
 }
 private static consumeItemEffect(kind:ZRSJZ_GunCastItemKind):boolean {
  if(!this.itemEffect(kind))return false;
  delete ZRSJZ_GameData.Instance.GunCastItemEffects[kind];ZRSJZ_GameData.SaveData();return true;
 }
 /** 每次看完视频获取一个，平台重复回调不会重复发放。 */
 static createItemVideoReward(kind:ZRSJZ_GunCastItemKind):()=>boolean {
  let rewarded=false;return ()=>{if(rewarded)return false;rewarded=true;return this.creditItem(kind,1);};
 }
 static readonly key = 'ZRSJZ_GunCast_v1';
 static load(): any {
  const empty=()=>({date:'',seen:[]});
  try {
   const d=JSON.parse(sys.localStorage.getItem(this.key));
   if(!d||typeof d!=='object'||Array.isArray(d))return empty();
   d.date=typeof d.date==='string'?d.date:'';
   d.seen=Array.isArray(d.seen)?d.seen.filter((name:any)=>typeof name==='string'):[];
   const r=d.round;
   if(r){
    if(typeof r!=='object'||Array.isArray(r)||!Number.isInteger(r.level)||r.level<0||r.level>12){delete d.round;return d;}
    r.id=Number.isFinite(r.id)?r.id:0;
    r.branch=Number.isInteger(r.branch)&&r.branch>=0&&r.branch<C.branches.length?r.branch:0;
    r.hits=Number.isSafeInteger(r.hits)&&r.hits>=0?Math.min(C.superHits,r.hits):0;
    r.ads=Number.isSafeInteger(r.ads)&&r.ads>=0?r.ads:0;
    r.superUntil=Number.isFinite(r.superUntil)&&r.superUntil>0?r.superUntil:0;
    r.broken=r.broken===true;r.recovered=r.recovered===true;
   }
   return d;
  } catch {return empty();}
 }
 static save(d:any) { sys.localStorage.setItem(this.key,JSON.stringify(d)); }
 static today() { const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
 static free() { return this.load().date !== this.today(); }
 /** 作弊入口：仅下一次有效敲击成功，退出界面后仍保留。 */
 static guaranteeNextSuccess() { const d=this.load();d.nextHitSuccess=true;this.save(d); }
 static enter(free:boolean):string { const d=this.load(); if(d.round)return ''; if(free&&!this.free())return '今日免费次数已用完'; if(!free&&ZRSJZ_GameData.Instance.Gold<C.entryCost)return '钞票不足';
 if(!free)ZRSJZ_AccountService.ChangeGold(-C.entryCost); d.date=this.today(); d.round={id:Date.now()+Math.random(),level:0,branch:0,hits:0,superUntil:0,broken:false,recovered:false,ads:0}; d.seen=d.seen||[];if(!d.seen.includes('0'))d.seen.push('0');this.save(d);return ''; }
 static hit(random=Math.random, now=Date.now()) { const d=this.load(), r=d.round;if(!r||r.broken||r.level>=12)return -1;
 if(r.superUntil&&now>=r.superUntil){r.superUntil=0;r.hits=0;}
 let result=1;
 if(d.nextHitSuccess){delete d.nextHitSuccess;}
 else if(this.consumeItemEffect('铸枪必成券')){result=1;}
 else {const probs=C.probabilities[r.level];let n=random()*100;result=4;for(let i=0;i<5;i++){n-=probs[i];if(n<0){result=i;break;}}}
 const protectedHit=r.superUntil>now;
 // 超级时刻本身已有保护时不消耗护盾；仅在实际抵挡损毁时移除效果。
 if(result===4&&!protectedHit&&this.consumeItemEffect('铸枪护盾'))result=2;
 if(result===0)r.level=Math.min(12,r.level+2);else if(result===1)r.level++;else if(!protectedHit&&result===3)r.level=Math.max(0,r.level-1);else if(!protectedHit&&result===4)r.broken=true;
 if(r.level===12)r.branch=Math.min(2,Math.floor(random()*3));
 const seen=r.level===12?'12:'+r.branch:String(r.level);if(!d.seen.includes(seen))d.seen.push(seen);
 if(!protectedHit&&!r.broken&&++r.hits>=C.superHits){r.superUntil=now+C.superDuration*1000;}
 this.save(d);return result; }
 static recoveryAds(r:any):number { const count=C.recoveryAdsByWeapon[this.item(r)] ?? C.recoveryAds; return Number.isFinite(count) ? Math.max(1,Math.floor(count)) : C.recoveryAds; }
 static recover() {const d=this.load(),r=d.round;if(!r?.broken||r.recovered)return; if(++r.ads>=this.recoveryAds(r)){r.broken=false;r.recovered=true;}this.save(d);}
 static item(r:any) {return r.level===12?C.branches[r.branch].item:C.weapons[r.level];}
 static finish(){const d=this.load();delete d.round;this.save(d);}
}
