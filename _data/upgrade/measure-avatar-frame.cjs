// Read atlas alpha only; do not modify art. Measure the enclosed avatar opening.
const fs=require('fs');
const {PNG}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
for(const id of [6,7,8,9,10]){
 const dir=`assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/头像框/头像框/Spine/${id}/`;
 const json=JSON.parse(fs.readFileSync(dir+'1.json'));
 const attachment=json.skins[0].attachments['框']['框'];
 const text=fs.readFileSync(dir+'1.atlas','utf8').split(/\r?\n/);
 const start=text.indexOf('框'); const fields={};
 for(let i=start+1;i<text.length&&/^\s/.test(text[i]);i++){const [k,v]=text[i].trim().split(': ');fields[k]=v;}
 const [ax,ay]=fields.xy.split(',').map(Number),[w,h]=fields.size.split(',').map(Number);
 const [ow,oh]=fields.orig.split(',').map(Number),[ox,oy]=fields.offset.split(',').map(Number);
 const png=PNG.sync.read(fs.readFileSync(dir+'1.png'));
 function alpha(x,y){const px=fields.rotate==='true'?y:x,py=fields.rotate==='true'?w-1-x:y;return png.data[((ay+py)*png.width+ax+px)*4+3];}
 const queue=[[Math.floor(w/2),Math.floor(h/2)]], seen=new Set();let minX=w,maxX=0,minY=h,maxY=0;
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],key=y*w+x;if(x<0||y<0||x>=w||y>=h||seen.has(key)||alpha(x,y)>32)continue;seen.add(key);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);}
 console.log(id,{attachment,opening:{x:(minX+maxX+1)/2+ox-ow/2+(attachment.x||0),y:oh/2-((minY+maxY+1)/2+(oh-h-oy))+(attachment.y||0),width:maxX-minX+1,height:maxY-minY+1},touchesEdge:minX===0||minY===0||maxX===w-1||maxY===h-1});
}
