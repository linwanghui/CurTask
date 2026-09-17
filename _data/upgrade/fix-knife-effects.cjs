const fs = require('fs');
const { call } = require('./mcp.cjs');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/';
const slots = [
 'images/skill/slj/tc_add/tc_0001',
 'images/skill/tybg_add/tybg_01',
 'images/skill/zuihouyiji/dtcg_add/dtcg_0001',
 'images/skill/zuihouyiji/twtd/twtd_0001',
 'images/skill/zuihouyiji/twtd/twtd_1',
 'images/skill/zuihouyiji/twtd/twtd_2',
 'images/skill/tybg_add/tybg_1',
 'images/skill/baodian_add/js_5_normal/js_5_0001',
 'images/skill/baodian_add/js_5_normal/js_5_1',
 'images/effect/xuanfeng/xuanfeng_00045',
 'images/effect/xuanfeng/xuanfeng_45',
 'dao1',
];
async function save(file, old, replacement) {
 const source = fs.readFileSync(file, 'utf8');
 const eol = source.includes('\r\n') ? '\r\n' : '\n';
 old = old.replace(/\n/g, eol);
 replacement = replacement.replace(/\n/g, eol);
 if (!source.includes(old)) throw Error('Missing edit target: ' + file);
 await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + file, content: source.replace(old, replacement) });
 console.log('Saved through MCP:', file);
}
(async () => {
 await save(root + 'ZRSJZ_PlayerSkeleton.ts',
 `    ClearAttackAnimation(): void {
        this._trackCompleteCallbacks.delete(1);
        this.Skeleton?.clearTrack(1);
    }`,
 `    ClearAttackAnimation(): void {
        this._trackCompleteCallbacks.delete(1);
        this.Skeleton?.clearTrack(1);
        // clearTrack 不会复位附件；中途死亡会跳过刀光动画末尾的隐藏帧。
        // 只清理攻击特效槽，保留实际武器 dao、服装和角色皮肤。
        for (const slotName of [
${slots.map(s => '            ' + JSON.stringify(s) + ',').join('\n')}
        ]) {
            this.Skeleton?.findSlot(slotName)?.setAttachment(null);
        }
    }`);
 await save(root + 'ZRSJZ_Player.ts',
 `    Resurgence(playerIndex?: number) {
        if (ZRSJZ_Game.Instance?.IsGameFinished) return;
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        this.CurHP = this.MaxHP;`,
 `    Resurgence(playerIndex?: number) {
        if (ZRSJZ_Game.Instance?.IsGameFinished) return;
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        // 复活前清掉被死亡打断的攻击状态、回调和刀光附件。
        this.CancelGunAttackState();
        this.CancelKnifeAttackState();
        this.CurHP = this.MaxHP;`);
})().catch(error => { console.error(error); process.exitCode = 1; });
