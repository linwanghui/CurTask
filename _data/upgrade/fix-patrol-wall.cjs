const fs=require('fs'),{call}=require('./mcp.cjs');
const file='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase.ts';
const original=fs.readFileSync(file,'utf8');let s=original.replace(/\r\n/g,'\n');
function edit(a,b){if(!s.includes(a))throw Error('Missing '+a);s=s.replace(a,b);}
edit('Component, Node, RigidBody2D,','Component, Node, PhysicsSystem2D, Rect, RigidBody2D,');
edit('    private _patrolWaitRemaining: number = 0;',`    private _patrolWaitRemaining: number = 0;
    private _patrolProgressTime = 0;
    private _patrolBlockedTime = 0;
    private _patrolLastPosition = new Vec3();`);
edit(`        this.NavigateTo(
            this._patrolTarget,`,`        // 独立于 A* 的卡住计时，避免 BuildPath 重置检测后无限重试同一巡逻点。
        this._patrolProgressTime += Math.max(0, dt);
        const interval = Math.max(0.25, ZRSJZ_PATH_CONFIG.StuckCheckInterval);
        if (this._patrolProgressTime >= interval) {
            const moved = Vec3.distance(current, this._patrolLastPosition);
            this._patrolBlockedTime = moved < Math.max(1, ZRSJZ_PATH_CONFIG.StuckDistance)
                ? this._patrolBlockedTime + this._patrolProgressTime : 0;
            this._patrolProgressTime = 0;
            this._patrolLastPosition.set(current);
            if (this._patrolBlockedTime >= Math.max(1, ZRSJZ_PATH_CONFIG.StuckTime)) {
                this.StopMoving();
                this.SelectNextPatrolPoint();
                return;
            }
        }

        this.NavigateTo(
            this._patrolTarget,`);
edit(`    private SelectNextPatrolPoint(): void {
        const radius`, `    /** 仅用于巡逻选点：检查完整身体宽度和落点空间，不改变追击寻路。 */
    private CanPatrolTo(candidate: Readonly<Vec3>): boolean {
        const radius = Math.max(1, ZRSJZ_PATH_CONFIG.AgentRadius);
        const offsetY = ZRSJZ_PATH_CONFIG.AgentOffsetY;
        const bounds = new Rect(candidate.x - radius, candidate.y + offsetY - radius, radius * 2, radius * 2);
        const blocked = PhysicsSystem2D.instance.testAABB(bounds).some(collider =>
            collider.enabledInHierarchy && !collider.sensor && (collider.group & ZRSJZ_TIER.地形) !== 0);
        if (blocked) return false;
        return ZRSJZ_PathFinder.HasDirectPath(this.node.worldPosition, candidate,
            ZRSJZ_TIER.地形, radius, offsetY, 1);
    }

    private SelectNextPatrolPoint(): void {
        // 新巡逻点不能继续使用旧目标的路径、速度或卡住计时。
        this.StopMoving();
        this.ClearNavigation();
        this._patrolProgressTime = 0;
        this._patrolBlockedTime = 0;
        this._patrolLastPosition.set(this.node.worldPosition);
        const radius`);
edit('            if (this.HasDirectPath(candidate)) {\n                this._patrolTarget.set(candidate);',`            if (Vec3.distance(this.node.worldPosition, candidate) > Math.max(0, this.EnemyConfig.PatrolArriveDistance)
                && this.CanPatrolTo(candidate)) {
                this._patrolTarget.set(candidate);`);
edit('        this._patrolTarget.set(this.node.worldPosition);\n    }','        this._patrolTarget.set(this.node.worldPosition);\n        this._patrolWaitRemaining = Math.max(0.25, this.EnemyConfig.PatrolWaitTime);\n    }');
fs.writeFileSync(__dirname+'/patrol-wall-before.ts.txt',original);
if(process.argv.includes('--local')){fs.writeFileSync(file,s.replace(/\n/g,'\r\n'));console.log('Patrol-only fix saved locally');}
else call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content:s.replace(/\n/g,'\r\n')}).then(()=>console.log('Patrol-only fix saved through MCP')).catch(e=>{console.error(e);process.exitCode=1;});
