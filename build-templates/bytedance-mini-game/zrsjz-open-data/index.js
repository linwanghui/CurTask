'use strict';
// Only this closed domain reads other players. Never send ranking data back to the main domain.
const catalog = require('./catalog.js');
const player = require('./spine-player.js')(image,meshPicture);
let artPaths = {};
let artTransfer = null;
const canvas = tt.getSharedCanvas();
const ctx = canvas.getContext('2d');
const types = ['wealth', 'raid', 'recharge'];
let visible = false, active = 'wealth', offset = 0, timer = null, sequence = 0;
let animationTimer = null, animationStarted = 0;
let viewport = { x: 0, y: 0, width: 2340, height: 1080 }, local = null, notice = '';
const cache = {}, requests = {}, imageCache = new Map();
function meshPicture(img,part) {
    if(!part || part.alpha<=0)return;
    ctx.globalAlpha=part.alpha==null?1:part.alpha;
    ctx.globalCompositeOperation=['source-over','lighter','multiply','screen'][part.blend||0];
    triangle(img,part.xy,part.uv,part.ix);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function invalidate() { if (visible) draw(); }
function image(path) {
    if (!path) return null;
    if (path.startsWith('art/')) { path=artPaths[path]; if(!path)return null; }
    let cached = imageCache.get(path);
    if (cached) {
        if(cached.failedAt && Date.now()-cached.failedAt>10000)imageCache.delete(path);
        else return cached.ready ? cached.img : null;
    }
    const img = tt.createImage(); cached = { img, ready: false }; imageCache.set(path, cached);
    img.onload = () => { cached.ready = true; invalidate(); };
    img.onerror = error => {
        cached.failedAt=Date.now();console.warn('[排行榜美术] 图片解码失败',path,error);
    };
    img.src = path;
    return null;
}
function picture(path, x, y, w, h) { const img = image(path); if (img) ctx.drawImage(img, x, y, w, h); }
function text(value, x, y, width, size = 38, fill = '#fff', outline = true) {
    value = String(value == null ? '' : value);
    ctx.font = size + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    while (ctx.measureText(value).width > width && size > 16) { size--; ctx.font = size + 'px sans-serif'; }
    if (outline) { ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(value, x, y); }
    ctx.fillStyle = fill; ctx.fillText(value, x, y);
}
function extra(value) {
    try {
        const e = JSON.parse(value || '{}');
        if (e.v !== 1) return {};
        const out = {};
        for (const k of ['a', 'f', 's', 'w', 'p']) if (Number.isInteger(e[k])) out[k] = e[k];
        if (/^\d{1,16}$/.test(e.q || '') && Number.isSafeInteger(Number(e.q))) out.q = Number(e.q);
        return out;
    } catch { return {}; }
}
function normal(item, type) {
    item = item && item.item || item || {};
    const score = Number(item.value), e = extra(item.extra);
    const unit = type === 'recharge' ? 1 : 10000;
    const raw = e.q !== undefined && Math.floor(e.q / unit) === score ? e.q : Math.max(0, score || 0) * unit;
    return { id: item.openid || item.sec_uid || '', name: item.nick_name || '抖音玩家',
        platformAvatar: item.user_img || '', raw, extra: e };
}
function format(raw) {
    const unit = raw >= 100000000 ? 100000000 : raw >= 10000 ? 10000 : 1;
    return String(Math.floor(raw / unit)) + (unit === 100000000 ? '亿' : unit === 10000 ? '万' : '');
}
function triangle(img, xy, uv, indices) {
    if (!img) return;
    for (let i = 0; i < indices.length; i += 3) {
        const ids = indices.slice(i, i + 3), p = [], t = [];
        for (const n of ids) { p.push(xy[n * 2], xy[n * 2 + 1]); t.push(uv[n * 2] * img.width, uv[n * 2 + 1] * img.height); }
        const [x0,y0,x1,y1,x2,y2] = p, [u0,v0,u1,v1,u2,v2] = t;
        const det = (u1-u0)*(v2-v0)-(u2-u0)*(v1-v0); if (Math.abs(det) < 0.00001) continue;
        const a=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/det;
        const b=((y1-y0)*(v2-v0)-(y2-y0)*(v1-v0))/det;
        const c=((x2-x0)*(u1-u0)-(x1-x0)*(u2-u0))/det;
        const d=((y2-y0)*(u1-u0)-(y1-y0)*(u2-u0))/det;
        ctx.save(); ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.lineTo(x2,y2); ctx.closePath(); ctx.clip();
        ctx.transform(a,b,c,d,x0-a*u0-c*v0,y0-b*u0-d*v0); ctx.drawImage(img,0,0); ctx.restore();
    }
}
function role(entry, layout) {
    ctx.save(); ctx.translate(1170 + layout.x, 540 - layout.y); ctx.scale(layout.sx, -layout.sy);
    try { player.role(entry,catalog,ctx); }
    catch(error) { console.warn('[排行榜美术] 角色绘制失败',error);notice='角色展示失败，请查看排行榜美术日志'; }
    finally { ctx.restore(); }
}
function avatar(entry, x, y, size) {
    const selected = catalog.skins[entry.extra.a];
    const path = selected ? catalog.avatarImages[selected] : entry.platformAvatar;
    const img = image(path);
    if (img) {
        ctx.save(); ctx.beginPath(); ctx.rect(x-size/2,y-size/2,size,size); ctx.clip();
        const side = Math.min(img.width,img.height);
        ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,x-size/2,y-size/2,size,size); ctx.restore();
    } else { ctx.fillStyle='#313954';ctx.fillRect(x-size/2,y-size/2,size,size);text('?',x,y,size,30); }
    const id=String(entry.extra.f || 1);
    if(Number(id)>=6 && Number(id)<=10){
        const openings={6:[0,-.26,128,122],7:[.27,-1.04,134,125],8:[-.48,.29,132,130],9:[-.5,.32,131,132],10:[.14,-1.43,132,131]};
        const opening=openings[id],scale=Math.min(size/opening[2],size/opening[3])*.99;
        ctx.save();ctx.translate(x-opening[0]*scale,y+opening[1]*scale);ctx.scale(scale,-scale);
        try { player.frame(id,ctx); } catch(error){console.warn('[排行榜美术] 头像框绘制失败',error);} finally {ctx.restore();}
    }else {
        // Start 的 Icon 使用 TRIMMED 原始宽高，与142像素头像按同一比例缩放。
        const img=image(catalog.frameImages[id]||catalog.frameImages['1']);
        if(img){const scale=size/142,w=img.width*scale,h=img.height*scale;
            ctx.drawImage(img,x-w/2,y-h/2-(['4','5'].includes(id)?10*scale:0),w,h);}
    }
}
function row(entry, index, x, y, mine, rank) {
    const l = catalog.layout.row, w = l.width, h = l.height;
    picture(mine ? 'art/self.png' : 'art/row.png',x-w/2,y-h/2,w,h);
    if (!mine && index < 3) picture('art/medal'+(index+1)+'.png',x+l.rank.x-56,y-34,112,68);
    else text(mine ? rank : index+1,x+l.rank.x,y+l.rank.y,l.rank.width,mine?32:42,mine?'#111':'#fff',!mine);
    avatar(entry,x+l.avatar.x,y+l.avatar.y,l.avatar.width);
    text(entry.name,x+l.name.x,y+l.name.y,l.name.width,l.name.fontSize,mine?'#111':'#fff',!mine);
    if(active!=='recharge') picture('art/currency.png',x+l.currency.x-l.currency.width/2,y+l.currency.y-l.currency.height/2,l.currency.width,l.currency.height);
    text(active==='recharge'?'¥'+(entry.raw/100).toFixed(2):format(entry.raw),x+l.value.x,y+l.value.y,l.value.width,l.value.fontSize);
}
function draw() {
    if (!visible) return;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.scale(canvas.width/2340,canvas.height/1080);
    const data = cache[active], entries = data && data.entries || [], l=catalog.layout;
    ctx.save();ctx.beginPath();ctx.rect(l.view.x-l.view.width/2+1170,540-l.view.y-l.view.height/2,l.view.width,l.view.height);ctx.clip();
    const max=Math.max(0,entries.length*l.step-l.view.height);offset=Math.max(0,Math.min(offset,max));
    entries.forEach((entry,i)=>row(entry,i,1170+l.view.x,540-l.view.y-l.view.height/2+l.row.height/2+i*l.step-offset,false));
    ctx.restore();
    for(let i=0;i<3;i++) {
        const podium=l.podiums[i],entry=entries[i];
        if(!entry) continue;
        role(entry,podium.role);
        text(entry.name,1170+podium.name.x,540-podium.name.y,podium.name.width,podium.name.fontSize);
    }
    let self=data&&data.self;
    if(!self && local)self={name:'抖音玩家',raw:local.values[active]||0,extra:local.extra||{},platformAvatar:''};
    if(self) row(self,0,1170+l.self.x,540-l.self.y,true,data ? data.selfRank>0 ? data.selfRank : '未上榜' : '待同步');
    let status=notice || data&&data.error || (data ? '每10秒更新 · 最多10名 · '+new Date(data.at).toLocaleTimeString() : '正在读取抖音排行榜…');
    text(status,1170+l.status.x,540-l.status.y,l.status.width,24,'#ddd',false);
    if(!entries.length)text(data&&data.error?'暂时无法读取榜单':data?'暂无上榜玩家':'加载中…',1170+l.view.x,540-l.view.y,700,38);
    ctx.restore();
}
function fetchBoard(type) {
    if(requests[type])return;
    const token=++sequence; requests[type]=token;
    let settled=false;
    const finish=(data,error)=>{
        if(settled)return;settled=true;clearTimeout(timeout);
        if(requests[type]!==token)return;delete requests[type];
        if(error){if(cache[type])cache[type].error='刷新失败，保留上次结果';else cache[type]={entries:[],self:null,selfRank:0,error:'读取失败，点击刷新重试',at:Date.now()};invalidate();return;}
        const seen=new Set();
        const entries=(Array.isArray(data.items)?data.items:[]).map(item=>normal(item,type)).filter(entry=>{
            if(!entry.id || seen.has(entry.id) || !Number.isFinite(entry.raw) || entry.raw<0 || type==='recharge'&&entry.raw===0)return false;
            seen.add(entry.id);return true;
        }).slice(0,10);
        const selfItem=data.self_item||{},selfInfo=data.self_user_info||{};
        let self=null;
        if(selfItem.item)self=normal({...selfInfo,...selfItem.item},type);
        else if(selfInfo.nick_name || selfInfo.openid)self={name:selfInfo.nick_name||'抖音玩家',platformAvatar:selfInfo.user_img||'',raw:local&&local.values[type]||0,extra:local&&local.extra||{}};
        cache[type]={entries,self,selfRank:Number(selfItem.rank)||0,at:Date.now(),error:''};notice='';invalidate();
    };
    const timeout=setTimeout(()=>finish(null,true),8000);
    try{tt.getImRankData({zoneId:'zrsjz_'+type+'_v1',dataType:0,relationType:'all',rankType:'all',pageNum:1,pageSize:10,
        success:r=>finish(r.data||{}),fail:()=>finish(null,true)});}catch{finish(null,true);}
}
function refresh(){if(visible)types.forEach(fetchBoard);}
tt.onMessage(message=>{
    if(message.type==='engine'&&message.event==='viewport'){viewport=message;return;}
    if(!message.ranking)return;
    switch(message.command){
        case 'artPath':
            if(typeof message.key==='string' && typeof message.path==='string'){artPaths[message.key]=message.path;invalidate();}
            break;
        case 'artBegin':
            if(Number.isInteger(message.count)&&message.count>0&&message.count<=320&&message.length>0&&message.length<=5*1024*1024)
                artTransfer={token:message.token,count:message.count,length:message.length,parts:[],received:0};
            break;
        case 'artChunk':
            if(artTransfer&&message.token===artTransfer.token&&Number.isInteger(message.index)&&message.index>=0&&message.index<artTransfer.count
                &&typeof message.data==='string'&&message.data.length<=65536&&artTransfer.parts[message.index]===undefined){
                artTransfer.parts[message.index]=message.data;artTransfer.received++;
            }
            break;
        case 'artEnd':
            if(artTransfer&&message.token===artTransfer.token){
                try{
                    if(artTransfer.received!==artTransfer.count)throw Error('missing artwork chunk');
                    const json=artTransfer.parts.join('');if(json.length!==artTransfer.length)throw Error('invalid artwork length');
                    const art=JSON.parse(json);
                    if(art.version!==2||!art.skeletons)throw Error('invalid artwork');
                    player.install(art.skeletons);console.log('[排行榜美术] 已接收资源',Object.keys(art.skeletons).join(','));animationStarted=Date.now();invalidate();
                }catch(error){console.warn('[排行榜美术] 数据解析失败',error);notice='动画资源解析失败，请查看排行榜美术日志';invalidate();}
                artTransfer=null;
            }
            break;
        case 'show':visible=true;active=types.includes(message.type)?message.type:'wealth';offset=0;animationStarted=Date.now();
            if(message.local)try{local=JSON.parse(message.local)}catch{}
            clearInterval(timer);timer=setInterval(refresh,10000);
            clearInterval(animationTimer);animationTimer=setInterval(invalidate,1000/24);draw();refresh();break;
        case 'select':if(types.includes(message.type)){active=message.type;offset=0;draw();if(!cache[active]||Date.now()-cache[active].at>8000)fetchBoard(active);}break;
        case 'refresh':if(message.local)try{local=JSON.parse(message.local)}catch{} refresh();break;
        case 'scroll':offset+=Number(message.delta)||0;draw();break;
        case 'uploadError':notice=String(message.text||'上传失败');invalidate();break;
        case 'hide':player.clear();visible=false;clearInterval(timer);timer=null;clearInterval(animationTimer);animationTimer=null;ctx.clearRect(0,0,canvas.width,canvas.height);break;
    }
});
