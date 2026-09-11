import { _decorator, Component, instantiate, Node, Prefab, sp, Vec3, Label, director, Director } from 'cc';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_OnlineService as Online } from '../Service/ZRSJZ_OnlineService';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_OnlineCombat as Coop } from '../Service/ZRSJZ_OnlineCombat';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_Bullet } from './ZRSJZ_Bullet';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_FriendlyDamageService } from '../Service/ZRSJZ_FriendlyDamageService';
import { ZRSJZ_Skill } from '../Skill/ZRSJZ_Skill';
const { ccclass } = _decorator;

/** 房主统一运行敌方战斗；双方玩家、宠物和拾取在所属客户端运行。 */
@ccclass('ZRSJZ_OnlineBattle')
export class ZRSJZ_OnlineBattle extends Component {
    public static PreviousModel = '1p';
    private online = false;
    private peer: Node = null;
    private skeleton: sp.Skeleton = null;
    private elapsed = 0;
    private initialized = false;
    private positioned = false;
    private skin = '';
    private target = new Vec3();
    private loading = new Set<string>();
    private completed = new Set<string>();
    private petTemplate: Prefab = null;
    private pet: Node = null;
    private petState: any = null;
    private petName = '';
    private petSkin = '';
    private petLoading = false;
    private endedSent = false;
    private solo = false;
    private soloStates = new Map<string, any>();
    private restoreNative = false;
    private weaponKey = '';
    private attackSerial = -1;

    protected onLoad(): void {
        this.online = Online.Battle;
        if (!this.online) { Online.OpenDoors.clear(); return; }
        Online.Events.on('peer_left', this.OnPeerLeft, this);
        Online.Events.on('battle_end', this.OnBattleEnd, this);
        Online.Events.on('combat', this.OnCombat, this);
        Online.Events.on('local_evacuated', this.OnLocalEvacuated, this);
        director.on(Director.EVENT_BEFORE_DRAW, this.ApplyPeerAim, this);
        if (Online.BattleEnded) { this.OnBattleEnd(Online.EndReason); return; }
        BundleManager.GetBundle('73_ZRSJZ_DLC').load('Prefabs/Unit/OnlinePet', Prefab, (error, prefab) => {
            if (this.isValid && !error) this.petTemplate = prefab;
        });
        BundleManager.GetBundle('73_ZRSJZ_DLC').load('Prefabs/Unit/OnlinePeer', Prefab, (error, prefab) => {
            if (!this.isValid || !this.node?.isValid || this.solo) return;
            if (error) { ZRSJZ_UIManager.Instance.ShowTip('队友外观加载失败，请检查 DLC 资源'); return; }
            this.peer = instantiate(prefab);
            Coop.Peer = this.peer;
            this.peer.active = false;
            this.skeleton = this.peer.getComponentInChildren(sp.Skeleton);
        });
    }

    protected update(dt: number): void {
        if (!this.online) return;
        const game = ZRSJZ_Game.Instance;
        const player = game?.CurPlayer;
        if (!player?.node?.isValid || !game.CurMap?.Unit?.isValid) return;
        if (this.solo) { this.ContinueSolo(); return; }
        if (Online.BattleEnded) return;
        if (Online.BattleHost && game.IsGameFinished && !this.endedSent) {
            this.endedSent = true;
            this.SyncEnemies();
            Online.Send('finish_battle', { reason: 'finished' });
        }
        if (!this.initialized) {
            this.initialized = true;
            // 两端固定同一出生点，客机偏移少量距离便于辨认。
            const point = game.CurMap.PlayerPoints[0];
            if (point) player.node.setWorldPosition(point.worldPosition.x + (Online.IsHost ? 0 : 100), point.worldPosition.y, point.worldPosition.z);
            ZRSJZ_UIManager.Instance.ShowTip('好友合作：怪物共享，掉落和拾取各自独立');
        }
        if (this.peer && !this.peer.parent) this.peer.setParent(game.CurMap.Unit);
        this.elapsed += dt;
        const local = player.PlayerSkeleton;
        if (this.elapsed >= 0.1 && local?.Skeleton) {
            this.elapsed = 0;
            Online.Send('pose', { pose: {
                x: player.node.worldPosition.x, y: player.node.worldPosition.y,
                sx: local.node.scale.x, sy: local.node.scale.y,
                skin: ZRSJZ_SKIN_CONFIG.get(local.SkinName)?.Skin || 'default',
                animation: local.Skeleton.getCurrent(0)?.animation?.name || 'daiji_q',
                dead: player.IsDead || game.IsGameFinished,
                weapon: local.WeaponryName || '', weaponSkin: local.WeaponryName ? ZRSJZ_AccountService.GetWeaponSkin(local.WeaponryName) : '',
                mx: local.Skeleton.findBone('mz')?.x || 0, my: local.Skeleton.findBone('mz')?.y || 0,
                aim: local.HasDirection && !local.IsKnife,
                attack: local.Skeleton.getCurrent(1)?.animation?.name || '', attackSerial: local.OnlineAttackSerial,
                attackTime: local.Skeleton.getCurrent(1)?.trackTime || 0, attackSpeed: local.Skeleton.getCurrent(1)?.timeScale || 1,
                attackLoop: local.Skeleton.getCurrent(1)?.loop || false,
            } });
            const pet = Coop.PetPose?.();
            Online.Combat({ kind: 'pet', pet: pet || null });
            this.SyncEnemies();
        }
        const pose = Online.PeerPose;
        if (!this.peer || !this.skeleton) return;
        this.peer.active = !!pose;
        if (!pose) { this.positioned = false; return; }
        this.target.set(pose.x, pose.y, 0);
        if (!this.positioned || Vec3.distance(this.peer.worldPosition, this.target) > 1200) {
            this.peer.setWorldPosition(this.target); this.positioned = true;
        } else this.peer.setWorldPosition(Vec3.lerp(new Vec3(), this.peer.worldPosition, this.target, Math.min(1, dt * 15)));
        this.skeleton.node.setScale(pose.sx, pose.sy, 1);
        const data = this.skeleton.skeletonData?.getRuntimeData();
        if (data?.findSkin(pose.skin) && this.skin !== pose.skin) {
            this.skeleton.setSkin(pose.skin); this.skin = pose.skin;
            this.weaponKey = '';
        }
        if (data?.findAnimation(pose.animation) && this.skeleton.getCurrent(0)?.animation?.name !== pose.animation) {
            this.skeleton.setAnimation(0, pose.animation, true);
        }
        this.UpdatePet(dt);
        void this.ApplyPeerWeapon();
        if (!pose.attack) { if (this.skeleton.getCurrent(1)) this.skeleton.clearTrack(1); }
        else if (data?.findAnimation(pose.attack) && (this.attackSerial !== pose.attackSerial || this.skeleton.getCurrent(1)?.animation?.name !== pose.attack)) {
            const entry = this.skeleton.setAnimation(1, pose.attack, !!pose.attackLoop);
            entry.trackTime = pose.attackTime || 0; entry.timeScale = pose.attackSpeed || 1;
            this.attackSerial = pose.attackSerial;
        }
    }
    private ApplyPeerAim(): void {
        const pose = Online.PeerPose;
        if (this.solo || !this.peer?.activeInHierarchy || !pose?.aim || !this.skeleton?._skeleton) return;
        const bone = this.skeleton.findBone('mz');
        if (bone && Number.isFinite(pose.mx) && Number.isFinite(pose.my)) {
            bone.x = pose.mx; bone.y = pose.my;
            this.skeleton._skeleton.updateWorldTransform();
        }
    }
    private async ApplyPeerWeapon(): Promise<void> {
        const pose = Online.PeerPose, skeleton = this.skeleton;
        if (!pose || !skeleton?._skeleton) return;
        const key = JSON.stringify([pose.skin, pose.weapon, pose.weaponSkin]);
        if (this.weaponKey === key) return;
        this.weaponKey = key;
        ZRSJZ_WEAPONRY_TYPE.forEach((_names, slot) => skeleton.findSlot(slot)?.setAttachment(null));
        skeleton.findSlot('dao')?.setAttachment(null);
        if (!pose.weapon) return;
        let gun = '';
        ZRSJZ_WEAPONRY_TYPE.forEach((names, slot) => { if (names.includes(pose.weapon)) gun = slot; });
        if (gun && skeleton.findSlot(gun)) {
            skeleton.setAttachment(gun, gun);
            try {
                const texture = await ZRSJZ_UIManager.Instance.GetWeaponryUI(pose.weaponSkin || pose.weapon);
                if (this.isValid && !this.solo && this.skeleton === skeleton && this.weaponKey === key && texture) skeleton.setSlotTexture(gun, texture, true);
            } catch (error) { if (this.weaponKey === key) this.weaponKey = ''; console.warn('[联机] 武器贴图加载失败', error); }
        } else {
            // 使用 JSON 检查附件，避免 JSB 查询不存在的附件时崩溃。
            let json: any = skeleton.skeletonData?.skeletonJson;
            if (typeof json === 'string') { try { json = JSON.parse(json); } catch { return; } }
            const skins = json?.skins;
            const attachments = Array.isArray(skins) ? skins.filter(s => s.name === pose.skin || s.name === 'default').map(s => s.attachments)
                : [skins?.[pose.skin], skins?.default];
            if (attachments.some(s => s?.dao?.[pose.weapon]) && skeleton.findSlot('dao')) skeleton.setAttachment('dao', pose.weapon);
        }
    }
    private SyncEnemies(): void {
        if (Online.BattleHost) {
            for (const [id, enemy] of ZRSJZ_EnemyBase.OnlineEnemies) {
                if (enemy?.isValid && enemy.node.activeInHierarchy) Online.CombatStates.set(id, enemy.GetOnlineState());
                else {
                    const last = Online.CombatStates.get(id);
                    if (last && !last.dead) Online.CombatStates.set(id, { ...last, removed: true });
                }
            }
            const states = [...Online.CombatStates.values()];
            for (let i = 0; i < states.length; i += 16) Online.Combat({ kind: 'states', states: states.slice(i, i + 16) });
        } else {
            for (const state of Online.CombatStates.values()) {
                if (this.completed.has(state.id)) continue;
                const enemy = ZRSJZ_EnemyBase.OnlineEnemies.get(state.id);
                if (state.removed) { enemy?.node?.destroy(); this.completed.add(state.id); continue; }
                if (!enemy?.isValid) { this.LoadEnemy(state); continue; }
                enemy.ApplyOnlineState(state);
                if (enemy.IsDead) this.completed.add(state.id);
            }
        }
    }
    private LoadEnemy(state: any): void {
        if (this.loading.has(state.id)) return;
        const names = ['持枪小兵', '持刀小兵', '盾牌兵', '喷火兵', 'Boss1', 'Boss2', 'Boss3'];
        if (!names.includes(state.name)) return;
        this.loading.add(state.id);
        const bundle = state.name === 'Boss2' || state.name === 'Boss3' ? '73_ZRSJZ_DLC' : '73_ZRSJZ';
        BundleManager.GetBundle(bundle).load('Prefabs/Unit/Enemy/' + state.name, Prefab, (error, prefab) => {
            this.loading.delete(state.id);
            if (!this.isValid || (Online.BattleEnded && !this.solo)) return;
            const latest = this.solo ? this.soloStates.get(state.id) : Online.CombatStates.get(state.id) || state;
            if (!latest || latest.removed || this.completed.has(state.id)) return;
            if (error) { console.error('[联机] 加载敌人失败', state.name, error); return; }
            const parent = ZRSJZ_Game.Instance?.CurMap?.Unit;
            if (!parent?.isValid) return;
            const node = instantiate(prefab);
            node.active = false;
            const enemy = node.getComponent(ZRSJZ_EnemyBase);
            if (!enemy) { node.destroy(); return; }
            enemy.OnlineID = state.id;
            node.setParent(parent);
            node.setWorldPosition(state.x, state.y, 0);
            node.active = true;
            ZRSJZ_EnemyBase.OnlineEnemies.set(state.id, enemy);
            if (this.solo) enemy.TakeOverLocally(latest);
        });
    }
    private OnCombat(packet: any): void {
        if (!this.isValid || Online.BattleEnded) return;
        if (packet.kind === 'pet') { this.petState = packet.pet; return; }
        if (Online.BattleHost && ['hit', 'stun', 'pull'].includes(packet.kind)) {
            const enemy = ZRSJZ_EnemyBase.OnlineEnemies.get(packet.id);
            if (!enemy?.isValid || !enemy.node.activeInHierarchy || enemy.IsDead) return;
            if (packet.kind === 'hit') enemy.BeHit(packet.harm);
            else if (packet.kind === 'stun') enemy.ApplyPetStun(packet.duration);
            else enemy.ApplyPetPull(new Vec3(packet.x, packet.y), packet.distance);
            return;
        }
        if (packet.kind === 'area' && !Online.BattleHost) {
            Coop.Applying = true;
            try { ZRSJZ_FriendlyDamageService.DamageArea(new Vec3(packet.x, packet.y), packet.range, packet.damage); }
            finally { Coop.Applying = false; }
        } else if (['shot', 'player_shot', 'flame'].includes(packet.kind)) {
            void this.SpawnAttack(packet);
        }
    }
    private async SpawnAttack(packet: any): Promise<void> {
        const game = ZRSJZ_Game.Instance;
        if (!game?.CurMap?.BulletParent?.isValid || game.IsGameFinished) return;
        const path = packet.kind === 'flame' ? 'Prefabs/Effect/Skill/FlamethrowerEffect'
            : 'Prefabs/Unit/' + (packet.kind === 'shot' ? 'EnemyBullet' : 'PlayerBullet');
        try {
            const node = await ZRSJZ_PoolManager.Instance.GetNode(path);
            if (!node) return;
            if (!this.isValid || Online.BattleEnded || game !== ZRSJZ_Game.Instance || !game.CurMap?.BulletParent?.isValid) {
                ZRSJZ_PoolManager.Instance.PutNode(node); return;
            }
            node.setParent(game.CurMap.BulletParent);
            const pos = new Vec3(packet.x, packet.y);
            if (packet.kind === 'flame') { node.active = true; node.getComponent(ZRSJZ_Skill).Show(pos, packet.dx, packet.dy, packet.harm); }
            else {
                const bullet = node.getComponent(ZRSJZ_Bullet);
                bullet.MoveSpeed = packet.speed;
                // 队友子弹只展示；真正命中只由开枪客户端上报，避免重复扣血。
                bullet.Show(pos, packet.dx, packet.dy, packet.range, packet.kind === 'player_shot' ? 0 : packet.harm, 1, true);
            }
        } catch (error) { console.error('[联机] 攻击资源加载失败', error); }
    }
    private UpdatePet(dt: number): void {
        const state = this.petState;
        if (!state) { if (this.pet) this.pet.active = false; return; }
        const paths: Record<string, string> = { '星核幼龙': 'Spine/星核幼龙/星核幼龙spine/星核幼龙', '小蜜蜂': 'Spine/小蜜蜂/小蜜蜂spine/小蜜蜂' };
        if (!paths[state.name] || !this.petTemplate) return;
        if (this.petName !== state.name && !this.petLoading) {
            this.petLoading = true;
            const name = state.name;
            BundleManager.GetBundle('73_ZRSJZ_DLC').load(paths[name], sp.SkeletonData, (error, data) => {
                this.petLoading = false;
                if (!this.isValid || this.solo || error || !ZRSJZ_Game.Instance?.CurMap?.Unit?.isValid) return;
                this.pet?.destroy();
                this.pet = instantiate(this.petTemplate);
                this.pet.active = false;
                this.pet.setParent(ZRSJZ_Game.Instance.CurMap.Unit);
                const spine = this.pet.getComponentInChildren(sp.Skeleton);
                spine.skeletonData = data;
                this.petSkin = '';
                for (const label of this.pet.getComponentsInChildren(Label)) label.string = '队友宠物';
                this.petName = name;
            });
            return;
        }
        if (!this.pet || this.petName !== state.name) return;
        const wasActive = this.pet.active;
        this.pet.active = true;
        const target = new Vec3(state.x, state.y);
        this.pet.setWorldPosition(wasActive ? Vec3.lerp(new Vec3(), this.pet.worldPosition, target, Math.min(1, dt * 15)) : target);
        this.pet.setScale(state.rx, state.ry, 1);
        const skeleton = this.pet.getComponentInChildren(sp.Skeleton);
        skeleton.node.setPosition(state.ox, state.oy, 0);
        skeleton.node.setScale(state.sx, state.sy, 1);
        const data = skeleton.skeletonData?.getRuntimeData();
        if (data?.findSkin(state.skin) && this.petSkin !== state.skin) { skeleton.setSkin(state.skin); this.petSkin = state.skin; }
        if (data?.findAnimation(state.animation) && skeleton.getCurrent(0)?.animation?.name !== state.animation) skeleton.setAnimation(0, state.animation, !state.dead);
    }
    private OnPeerLeft(): void {
        this.OnBattleEnd();
    }
    private OnLocalEvacuated(): void {
        if (this.solo || this.endedSent || !Online.Battle) return;
        this.endedSent = true;
        if (Online.BattleHost) this.SyncEnemies();
        Online.Send('finish_battle', { reason: 'evacuated' });
    }
    private OnBattleEnd(reason = 'disconnected'): void {
        if (this.solo) return;
        this.solo = true;
        const wasGuest = !Online.BattleHost;
        if (wasGuest) {
            this.soloStates = new Map(Online.CombatStates);
            this.restoreNative = this.soloStates.size === 0;
            Coop.SuppressNative = !this.restoreNative;
        }
        // 先退出联机标志，再断开连接，避免 Disconnect 重入结束事件。
        Online.Battle = false;
        Online.BattleHost = false;
        Online.Disconnect();
        this.peer?.destroy(); this.peer = null;
        this.pet?.destroy(); this.pet = null;
        this.petState = null;
        Coop.Peer = null;
        this.ContinueSolo();
        // 不改变本地暂停/死亡/结算状态，也不重置地图、背包、时间或撤离倒计时。
        if (!ZRSJZ_Game.Instance?.IsGameFinished) {
            const message = reason === 'evacuated' ? '队友已撤离' : reason === 'finished' ? '队友已结束本局' : '队友已离开或连接中断';
            ZRSJZ_UIManager.Instance?.ShowTip(message + '，已转为单机，可继续战斗和撤离');
        }
    }
    private ContinueSolo(): void {
        const game = ZRSJZ_Game.Instance;
        if (!game?.CurMap?.Unit?.isValid || game.IsGameFinished) return;
        Coop.SuppressNative = false;
        if (this.restoreNative) {
            for (const enemy of game.CurMap.Unit.getComponentsInChildren(ZRSJZ_EnemyBase)) enemy.RestoreSuppressedEnemy();
            this.restoreNative = false;
        }
        for (const [id, state] of this.soloStates) {
            const enemy = ZRSJZ_EnemyBase.OnlineEnemies.get(id);
            if (this.completed.has(id) || state.removed) {
                if (state.removed) enemy?.node?.destroy();
                this.soloStates.delete(id);
            } else if (enemy?.isValid) {
                enemy.TakeOverLocally(state);
                this.soloStates.delete(id);
            } else this.LoadEnemy(state);
        }
    }
    protected onDestroy(): void {
        if (!this.online) return;
        Online.Events.off('peer_left', this.OnPeerLeft, this);
        Online.Events.off('combat', this.OnCombat, this);
        Online.Events.off('battle_end', this.OnBattleEnd, this);
        Online.Events.off('local_evacuated', this.OnLocalEvacuated, this);
        director.off(Director.EVENT_BEFORE_DRAW, this.ApplyPeerAim, this);
        this.peer?.destroy();
        this.pet?.destroy();
        Coop.Peer = null;
        Coop.PetPose = null;
        Coop.Applying = false;
        Coop.SuppressNative = false;
        ZRSJZ_EnemyBase.OnlineEnemies.clear();
        Online.CombatStates.clear();
        Online.Battle = false;
        Online.Disconnect();
        ZRSJZ_GameData.Instance.CurModel = ZRSJZ_OnlineBattle.PreviousModel;
    }
}
