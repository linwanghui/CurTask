import { _decorator, Director, director, Vec3 } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass } = _decorator;

interface ZRSJZ_MainHandSlot {
    index: number;
    name: string;
    isGunHand: boolean;
}

@ccclass('ZRSJZ_MainSkeleton')
export class ZRSJZ_MainSkeleton extends ZRSJZ_Skeleton {
    CurPlayerIndex: number = 0;
    Facing: number = 1;

    private _isKnife: boolean = false;
    private readonly _baseScale = new Vec3();
    private readonly _trackCompleteCallbacks = new Map<number, Function>();
    /**
     * 大厅只关心枪/刀两套手部插槽。提前缓存索引，避免像战斗脚本一样
     * 在 EVENT_BEFORE_DRAW 中逐帧扫描完整 Skeleton 的全部插槽。
     */
    private readonly _weaponHandSlots: ZRSJZ_MainHandSlot[] = [];

    get IsKnife(): boolean {
        return this._isKnife;
    }

    set IsKnife(value: boolean) {
        if (this._isKnife === value) return;
        this._isKnife = value;
        this.ApplyWeaponHandSlots();
    }

    protected GetEquippedWeaponryIDs(): string[] {
        return ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex);
    }

    protected onLoad(): void {
        super.onLoad();
        if (!this.Skeleton) return;

        if (this.node.parent?.name === 'Player2' || this.node.parent?.name === '玩家2') {
            this.CurPlayerIndex = 1;
        }
        this._baseScale.set(this.node.scale);
        this.CacheWeaponHandSlots();
        this.Skeleton.setCompleteListener(this.OnAnimationComplete);
    }

    protected onEnable(): void {
        this.Show();
        // 部分旧 Spine 动画缺少手部隐藏关键帧。大厅仍在绘制前兜底，
        // 但这里只检查缓存的少量手部插槽，不再遍历全部 217 个插槽。
        director.on(Director.EVENT_BEFORE_DRAW, this.ApplyWeaponHandSlots, this);
    }

    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.ApplyWeaponHandSlots, this);
        this.ClearAttackAnimation();
        this._trackCompleteCallbacks.clear();
    }

    /** 首次进入大厅或重新激活玩家时，恢复该玩家的皮肤及整套已穿戴装备。 */
    Show(): void {
        if (!this.Skeleton) return;

        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.CurPlayerIndex]);
        const weaponryIDs = this.GetEquippedWeaponryIDs();
        for (let i = weaponryIDs.length - 1; i >= 0; i--) {
            const prop = ZRSJZ_GameData.Instance.PropData[weaponryIDs[i]];
            if (prop) void this.ShowEquipment(prop.Name);
        }
    }

    SetSkin(skinName: string): void {
        super.SetSkin(skinName);
        this.ApplyWeaponHandSlots();
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null): void {
        if (!this.Skeleton || !aniName) return;
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.SetTrackCompleteCallback(0, cb);
    }

    /** 保留大厅持刀姿态所需的 Track 1，不包含战斗瞄准和攻击逻辑。 */
    PlayKnifeBaseAni(aniName: string): void {
        if (!this.Skeleton || !aniName) return;
        const currentEntry = this.Skeleton.getCurrent(1);
        if (currentEntry?.animation?.name === aniName && currentEntry.loop) return;
        this.Skeleton.setAnimation(1, aniName, true);
        this.SetTrackCompleteCallback(1, null);
    }

    ClearAttackAnimation(): void {
        this._trackCompleteCallbacks.delete(1);
        this.Skeleton?.clearTrack(1);
    }

    SetPlayerDir(x: number): void {
        if (!x) return;
        const facing = x > 0 ? 1 : -1;
        if (this.Facing === facing && Math.sign(this.node.scale.x) === facing) return;

        this.Facing = facing;
        this.node.setScale(
            Math.abs(this._baseScale.x) * facing,
            this._baseScale.y,
            this._baseScale.z,
        );
    }

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        await super.ShowEquipment(equipmentName, isEquipment);
        this.ApplyWeaponHandSlots();
    }

    private CacheWeaponHandSlots(): void {
        this._weaponHandSlots.length = 0;
        const skeleton = this.Skeleton?._skeleton;
        if (!skeleton) return;

        for (let index = 0; index < skeleton.slots.length; index++) {
            const name = skeleton.slots[index].data.name;
            const isGunHand = name.includes('左手3拿枪手1');
            const isKnifeHand = name.includes('左手3拿枪手2');
            if (!isGunHand && !isKnifeHand) continue;

            this._weaponHandSlots.push({ index, name, isGunHand });
        }
    }

    private ApplyWeaponHandSlots(): void {
        if (!this.isValid || !this.node?.isValid || !this.node.activeInHierarchy || !this.Skeleton?.isValid) return;
        const skeleton = this.Skeleton?._skeleton;
        if (!skeleton) return;

        for (const handSlot of this._weaponHandSlots) {
            const slot = skeleton.slots[handSlot.index];
            // 换皮肤或销毁过程中缓存索引可能暂时不再对应原槽位，此时等待下一次重新初始化。
            if (!slot?.data || slot.data.name !== handSlot.name) continue;
            // 保持原 ZRSJZ_PlayerSkeleton 的显示规则，避免替换组件后枪/刀手部反转。
            const shouldHide = this._isKnife
                ? !handSlot.isGunHand
                : handSlot.isGunHand;

            if (shouldHide) {
                if (slot.attachment) slot.setAttachment(null);
            } else if (!slot.attachment) {
                // Cocos 3.8.6 Android 的 Skeleton.getAttachment JSB 转换在高频调用时可能
                // 访问失效的 spine::String 并直接造成 libcocos.so 原生崩溃。这里通过
                // Skeleton 组件按名称恢复附件，彻底避开该 getAttachment 原生接口。
                this.Skeleton.setAttachment(handSlot.name, handSlot.name);
            }
        }
    }

    private SetTrackCompleteCallback(trackIndex: number, cb: Function): void {
        if (cb) this._trackCompleteCallbacks.set(trackIndex, cb);
        else this._trackCompleteCallbacks.delete(trackIndex);
    }

    private readonly OnAnimationComplete = (trackEntry: any): void => {
        const trackIndex = trackEntry?.trackIndex ?? 0;
        const cb = this._trackCompleteCallbacks.get(trackIndex);
        if (!trackEntry?.loop) this._trackCompleteCallbacks.delete(trackIndex);
        if (cb) cb();
    };

}


