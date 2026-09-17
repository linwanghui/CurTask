const fs=require('fs'),{call}=require('./mcp.cjs');
const f='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Bullet.ts';let s=fs.readFileSync(f,'utf8');
const old='        this.node.active = true;\r\n    }\r\n\r\n    BeginContact';
if(!s.includes(old))throw Error('Missing bullet activation');
const replacement=`        this.node.active = true;
        // 枪口刷新后才出弹，此时本帧物理步进已结束，节点变换标记又会在帧末清除。
        // 立即同步 Cocos 3.8.6 Box2D 刚体，避免下帧用对象池中的旧位置、旧角度覆盖节点。
        const body = this._rigidBody?.impl as {
            syncPositionToPhysics?: () => void;
            syncRotationToPhysics?: () => void;
        };
        body?.syncPositionToPhysics?.();
        body?.syncRotationToPhysics?.();
    }

    BeginContact`.replace(/\n/g,'\r\n');
s=s.replace(old,replacement);
(async()=>{try{await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+f,content:s});console.log('MCP saved');}catch(e){if(e.cause?.code!=='ECONNREFUSED')throw e;fs.writeFileSync(f,s);console.log('MCP unavailable; saved locally');}})().catch(e=>{console.error(e);process.exitCode=1;});
