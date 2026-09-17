const fs=require('fs'),{call}=require('./mcp.cjs');
const file='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase.ts';
const original=fs.readFileSync(file,'utf8');let s=original.replace(/\r\n/g,'\n');
s=s.replace('Collider2D, Color,','Collider2D, BoxCollider2D, CircleCollider2D, PolygonCollider2D, Intersection2D, Color,');
const old=`        const blocked = PhysicsSystem2D.instance.testAABB(bounds).some(collider =>
            collider.enabledInHierarchy && !collider.sensor && (collider.group & ZRSJZ_TIER.地形) !== 0);`;
if(!s.includes(old))throw Error('Missing clearance check');
s=s.replace(old,`        const blocked = PhysicsSystem2D.instance.testAABB(bounds).some(collider => {
            if (!collider.enabledInHierarchy || collider.sensor || (collider.group & ZRSJZ_TIER.地形) === 0) return false;
            // testAABB 只返回粗略包围盒候选；凹形墙的包围盒也覆盖可走空地。
            // 再检查真实形状，避免空地被误判后敌人一直原地等候。
            if (collider instanceof BoxCollider2D || collider instanceof PolygonCollider2D) {
                return Intersection2D.rectPolygon(bounds, collider.worldPoints);
            }
            if (collider instanceof CircleCollider2D) {
                const center = collider.worldPosition;
                const dx = center.x - Math.max(bounds.x, Math.min(bounds.xMax, center.x));
                const dy = center.y - Math.max(bounds.y, Math.min(bounds.yMax, center.y));
                return dx * dx + dy * dy <= collider.worldRadius * collider.worldRadius;
            }
            return true;
        });`);
fs.writeFileSync(__dirname+'/patrol-clearance-before.ts.txt',original);
call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content:s.replace(/\n/g,'\r\n')}).then(()=>console.log('Precise patrol clearance saved via MCP')).catch(e=>{console.error(e);process.exitCode=1;});
