const fs=require('fs'),{call}=require('./mcp.cjs');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
async function edit(path,fn){const f=root+path;const old=fs.readFileSync(f,'utf8');let s=old.replace(/\r\n/g,'\n');s=fn(s);fs.writeFileSync(__dirname+'/'+path.split('/').pop()+'.muzzle-before.txt',old);if(process.argv.includes('--local'))fs.writeFileSync(f,s.replace(/\n/g,'\r\n'));else await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+f,content:s.replace(/\n/g,'\r\n')});console.log('saved',path);}
function rep(s,a,b){if(!s.includes(a))throw Error('Missing '+a);return s.replace(a,b);}
(async()=>{
await edit('Controller/ZRSJZ_PlayerSkeleton.ts',s=>{
 s=rep(s,'    private _mzBone:', '    private _afterAimAttack: (() => void) = null;\n\n    private _mzBone:');
 s=s.replaceAll('Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this','Director.EVENT_BEFORE_DRAW, this.UpdateAimAndAttack, this');
 s=rep(s,'    ClearAttackAnimation(): void {','    ClearAttackAnimation(): void {\n        this._afterAimAttack = null;');
 s=rep(s,'    private ApplyAimDirection(): void {',`    /** 动画事件只排队，待骨骼姿态与本帧绘制一致后执行。 */
    QueueAttackAfterAim(callback: () => void): void { this._afterAimAttack = callback; }

    private UpdateAimAndAttack(): void {
        this.ApplyAimDirection();
        const attack = this._afterAimAttack;
        this._afterAimAttack = null;
        attack?.();
    }

    private ApplyAimDirection(): void {`);return s;
});
await edit('Controller/ZRSJZ_Player.ts',s=>{
 s=rep(s,'    private _waitingFirstGunShot: boolean = false;','    private _waitingFirstGunShot: boolean = false;\n    private _gunShotPending = false;');
 s=rep(s,'                this.FireReservedGunBullet();','                this.QueueReservedGunBullet();');
 s=rep(s,'    private FireReservedGunBullet(): void {',`    private QueueReservedGunBullet(): void {
        if (this._gunShotPending || !this._waitingFirstGunShot || !this._reservedGunBullet) return;
        this._gunShotPending = true;
        const requestId = this._gunAttackRequestId;
        const flush = () => {
            if (!this._gunShotPending || requestId !== this._gunAttackRequestId) return;
            const game = ZRSJZ_Game.Instance;
            if (!game || game.IsGameFinished || this.IsDead || !this.node.activeInHierarchy || this.WeaponType !== '枪') {
                this.CancelGunAttackState();
                return;
            }
            if (game.GamePaused) { this.PlayerSkeleton.QueueAttackAfterAim(flush); return; }
            this._gunShotPending = false;
            this.FireReservedGunBullet();
            // 低帧率下开火与完成事件可能在同一帧到达，先出弹再结束动画。
            if (this._gunAttackAnimationPlayedOnce) this.OnGunAttackAnimationComplete();
        };
        this.PlayerSkeleton.QueueAttackAfterAim(flush);
    }

    private FireReservedGunBullet(): void {`);
 s=rep(s,'        // 主子弹只能由整体 Spine 的 Track 1 开枪事件调用此方法生成。','        // 由 Track 1 开枪事件排队，在瞄准骨骼刷新后生成主子弹。');
 s=rep(s,'    private CancelGunAttackState(): void {','    private CancelGunAttackState(): void {\n        this._gunShotPending = false;');
 s=rep(s,'        this._gunAttackAnimationPlayedOnce = true;\n        // 子弹只由 Spine', '        this._gunAttackAnimationPlayedOnce = true;\n        if (this._gunShotPending) return;\n        // 子弹只由 Spine');
 s=rep(s,'        const muzzleRequestGame = ZRSJZ_Game.Instance;','        const muzzleRequestGame = ZRSJZ_Game.Instance;\n        const muzzleRequestId = this._gunAttackRequestId;');
 s=rep(s,'            if (!this.CanUseAsyncResult(muzzleRequestGame)) {',"            if (!this.CanUseAsyncResult(muzzleRequestGame) || this.IsDead || this.WeaponType !== '枪' || muzzleRequestId !== this._gunAttackRequestId) {");
 s=rep(s,`            // 异步加载结束时玩家可能已经移动或改变瞄准方向，必须沿用这一发的枪口快照。
            muzzle.Show(mainBulletSpawnPos, attackX, attackY);`,`            // 子弹保留发射快照；短暂枪口火焰跟随当前枪口，避免异步加载和转向造成错位。
            muzzle.Show(mainBulletSpawnPos, attackX, attackY, () => {
                if (!this.CanUseAsyncResult(muzzleRequestGame) || this.IsDead || this.WeaponType !== '枪'
                    || muzzleRequestId !== this._gunAttackRequestId) return null;
                const position = this.getMuzzlePos();
                return position ? { position, x: this.PlayerSkeleton.AttackX, y: this.PlayerSkeleton.AttackY } : null;
            });`);return s;
});
await edit('Effect/ZRSJZ_MuzzleEffect.ts',s=>{
 s=rep(s,'Component, Node, sp, Vec3','Component, Director, director, Node, sp, Vec3');
 s=rep(s,'    Show(worldPos: Vec3, dirX: number, dirY: number) {',`    private _poseProvider: (() => { position: Vec3; x: number; y: number }) = null;

    protected onEnable(): void { director.on(Director.EVENT_BEFORE_DRAW, this.FollowMuzzle, this); }
    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.FollowMuzzle, this);
        this._poseProvider = null;
    }
    private FollowMuzzle(): void {
        if (!this._poseProvider) return;
        const pose = this._poseProvider();
        if (!pose) { ZRSJZ_PoolManager.Instance.PutNode(this.node); return; }
        this.node.setWorldPosition(pose.position);
        if (pose.x !== 0 || pose.y !== 0) this.node.setWorldRotationFromEuler(0, 0, Math.atan2(pose.y, pose.x) * 180 / Math.PI);
    }

    Show(worldPos: Vec3, dirX: number, dirY: number,
        poseProvider: (() => { position: Vec3; x: number; y: number }) = null) {`);
 s=rep(s,'        this.node.active = true;','        this._poseProvider = poseProvider;\n        this.node.active = true;');
 s=rep(s,'        this.node.setWorldRotationFromEuler(0, 0, angle);','        this.node.setWorldRotationFromEuler(0, 0, angle);\n        this.FollowMuzzle();');return s;
});
})().catch(e=>{console.error(e);process.exitCode=1;});
