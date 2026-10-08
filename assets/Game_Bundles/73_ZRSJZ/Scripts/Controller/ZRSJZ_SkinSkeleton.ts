import { _decorator, assetManager, director, Director, instantiate, isValid, Layers, Node, Prefab, sp, Vec3 } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_UluMissile } from '../Skill/ZRSJZ_UluMissile';
const { ccclass, property } = _decorator;

/** 皮肤预览同样使用一套完整 Spine。 */
@ccclass('ZRSJZ_SkinSkeleton')
export class ZRSJZ_SkinSkeleton extends ZRSJZ_Skeleton {

    @property({ type: Node, displayName: "乌鲁鲁技能落点" })
    UluLuluSkillPoint: Node = null;

    @property({ displayName: '乌鲁鲁特效路径（DLC）' })
    UluSkillPath = 'Prefabs/Effect/技能_乌鲁';

    @property({ displayName: '预览导弹缩放', min: 0.01 })
    UluEffectScale = 0.65;

    @property({ displayName: '预览导弹上抛高度', min: 1 })
    UluArcHeight = 140;

    @property({ type: Node, displayName: '蜂医技能释放点' })
    FengYiSkillPoint: Node = null;

    @property({ displayName: '蜂医特效路径（DLC）' })
    FengYiSkillPath = 'Prefabs/Effect/技能_蜂医';

    @property({ displayName: '蜂医预览特效缩放', min: 0.01 })
    FengYiEffectScale = 0.8;

    @property({ type: Node, displayName: '露娜出场特效释放点' })
    LunaEffectPoint: Node = null;

    @property({ displayName: '露娜出场特效路径（DLC）' })
    LunaEffectPath = 'Prefabs/Effect/出场特效_露娜';

    @property({ displayName: '露娜出场特效缩放', min: 0.01 })
    LunaEffectScale = 0.8;

    private readonly _pendingMissiles: string[] = [];
    private readonly _previewEffects = new Set<Node>();
    private _uluSkillPrefab: Prefab = null;
    private _uluSkillLoading: Promise<Prefab> = null;
    private _entranceVersion = 0;
    private _pendingFengYi = false;
    private _fengYiSkillPrefab: Prefab = null;
    private _fengYiSkillLoading: Promise<Prefab> = null;
    private _lunaEffectPrefab: Prefab = null;
    private _lunaEffectLoading: Promise<Prefab> = null;

    protected onLoad(): void {
        super.onLoad();
        this.BindEntranceEvents();
    }

    protected OnSkeletonDataChanged(): void {
        this.BindEntranceEvents();
    }

    protected onEnable(): void {
        // Spine 事件触发时当帧骨骼矩阵可能尚未更新，渲染前再读取最终姿势。
        director.on(Director.EVENT_BEFORE_DRAW, this.FlushMissiles, this);
    }

    protected onDisable(): void {
        this._entranceVersion++;
        director.off(Director.EVENT_BEFORE_DRAW, this.FlushMissiles, this);
        this.ClearPreviewEffects();
    }

    private BindEntranceEvents(): void {
        this.Skeleton?.setStartListener(trackEntry => {
            if (!this.node.activeInHierarchy || trackEntry?.trackIndex !== 0
                || trackEntry.animation?.name !== 'cc_露娜') return;
            if (this._lunaEffectPrefab) {
                this.LaunchLunaEffect();
                return;
            }
            // 兼容直接调用 PlayAni；切换角色或动画后不补播过期特效。
            const version = this._entranceVersion;
            void this.LoadLunaEffect().then(() => {
                if (isValid(this, true) && this.node.activeInHierarchy
                    && version === this._entranceVersion && this.Skeleton?.getCurrent(0) === trackEntry) {
                    this.LaunchLunaEffect();
                }
            }).catch(error => console.error('[ZRSJZ_SkinSkeleton] 露娜出场特效加载失败', error));
        });
        this.Skeleton?.setEventListener((trackEntry, event) => {
            if (typeof event === "number") return;
            if (!this.node.activeInHierarchy || trackEntry?.trackIndex !== 0) return;
            const name = event.data.name;
            if (trackEntry.animation?.name === 'cc_乌鲁' && /^p[1-4]$/.test(name)) this._pendingMissiles.push(name);
            if (trackEntry.animation?.name === 'cc_蜂医' && name === 'fy') this._pendingFengYi = true;
        });
    }

    private FlushMissiles(): void {
        const names = this._pendingMissiles.splice(0);
        for (const name of names) this.LaunchPreviewMissile(name);
        if (this._pendingFengYi) {
            this._pendingFengYi = false;
            this.LaunchFengYiEffect();
        }
        this._previewEffects.forEach(effect => {
            if (!isValid(effect, true)) this._previewEffects.delete(effect);
        });
    }

    private LaunchPreviewMissile(name: string): void {
        const target = this.UluLuluSkillPoint?.getChildByName(name);
        const bone = this.Skeleton?.findBone(name);
        if (!this._uluSkillPrefab || !target || !bone) return;

        const start = new Vec3(bone.worldX, bone.worldY, 0);
        const forward = new Vec3(bone.worldX + bone.a, bone.worldY + bone.c, 0);
        Vec3.transformMat4(start, start, this.node.worldMatrix);
        Vec3.transformMat4(forward, forward, this.node.worldMatrix);
        const direction = Vec3.subtract(new Vec3(), forward, start);
        const effect = instantiate(this._uluSkillPrefab);
        // 独立于 Skin 节点，避免角色缩放和下一段出场动画带动已发射的导弹。
        this.UluLuluSkillPoint.addChild(effect);
        const uiLayer = 1 << Layers.nameToLayer('UI');
        const setLayer = (node: Node): void => {
            node.layer = uiLayer;
            node.children.forEach(setLayer);
        };
        setLayer(effect);
        effect.setScale(this.UluEffectScale, this.UluEffectScale, 1);
        const missile = effect.getComponent(ZRSJZ_UluMissile);
        if (!missile) {
            effect.destroy();
            console.error('[ZRSJZ_SkinSkeleton] 乌鲁鲁技能预制体缺少 ZRSJZ_UluMissile');
            return;
        }
        this._previewEffects.add(effect);
        missile.RecycleToPool = false;
        missile.LaunchDistance = 65;
        missile.LaunchSpeed = 600;
        missile.FlightDuration = 0.85;
        missile.ArcHeight = this.UluArcHeight;
        missile.Show(start, direction, target.worldPosition);
    }

    private LaunchFengYiEffect(): void {
        this.LaunchSpinePreviewEffect(this._fengYiSkillPrefab, this.FengYiSkillPoint, this.FengYiEffectScale, 'in');
    }

    private LaunchLunaEffect(): void {
        this.LaunchSpinePreviewEffect(this._lunaEffectPrefab, this.LunaEffectPoint, this.LunaEffectScale, 'action');
    }

    private LaunchSpinePreviewEffect(prefab: Prefab, point: Node, scale: number, animation: string): void {
        if (!prefab) return;
        const parent = point?.parent ?? this.node.parent;
        if (!parent) return;
        const effect = instantiate(prefab);
        parent.addChild(effect);
        // 特效紧邻角色绘制，后面的名字、详情和按钮仍显示在特效之上。
        if (parent === this.node.parent) effect.setSiblingIndex(this.node.getSiblingIndex() + 1);
        const setLayer = (node: Node): void => {
            node.layer = this.node.layer;
            node.children.forEach(setLayer);
        };
        setLayer(effect);
        effect.setWorldPosition(point?.worldPosition ?? this.node.worldPosition);
        effect.setScale(scale, scale, 1);
        const skeleton = effect.getComponentInChildren(sp.Skeleton);
        if (!skeleton || !skeleton.findAnimation(animation)) {
            effect.destroy();
            console.error(`[ZRSJZ_SkinSkeleton] ${prefab.name} 缺少 ${animation} 动画`);
            return;
        }
        this._previewEffects.add(effect);
        skeleton.setCompleteListener(() => {
            this._previewEffects.delete(effect);
            if (isValid(effect, true)) effect.destroy();
        });
        skeleton.setAnimation(0, animation, false);
    }

    private ClearPreviewEffects(): void {
        this._pendingFengYi = false;
        this._pendingMissiles.length = 0;
        this._previewEffects.forEach(effect => {
            if (isValid(effect, true)) effect.destroy();
        });
        this._previewEffects.clear();
    }

    SetSkin(skinName: string): void {
        this.ClearPreviewEffects();
        const version = ++this._entranceVersion;
        this.node.active = true;
        super.SetSkin(skinName);
        void this.ShowEquipment("DX9-冲锋枪");
        const anis = [...(ZRSJZ_SKIN_CONFIG.get(this.SkinName)?.EntranceAnis ?? [])]
            .filter(name => !!this.Skeleton?.findAnimation(name));
        const loads: Promise<Prefab>[] = [];
        if (anis.includes('cc_乌鲁')) loads.push(this.LoadUluSkill());
        if (anis.includes('cc_蜂医')) loads.push(this.LoadFengYiSkill());
        if (anis.includes('cc_露娜')) loads.push(this.LoadLunaEffect());
        if (loads.length) {
            // 首次载入时等待特效资源，保证出场动画与特效同步。
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
            void Promise.all(loads).then(() => {
                if (isValid(this, true) && this.node.activeInHierarchy && version === this._entranceVersion) {
                    this.ShowEntranceAnis(anis);
                }
            }).catch(error => {
                console.error('[ZRSJZ_SkinSkeleton] 出场特效加载失败', error);
                if (isValid(this, true) && this.node.activeInHierarchy && version === this._entranceVersion) {
                    this.ShowEntranceAnis(anis);
                }
            });
        } else {
            this.ShowEntranceAnis(anis);
        }
    }

    private LoadLunaEffect(): Promise<Prefab> {
        if (this._lunaEffectPrefab) return Promise.resolve(this._lunaEffectPrefab);
        if (this._lunaEffectLoading) return this._lunaEffectLoading;
        this._lunaEffectLoading = this.LoadSkillPrefab(this.LunaEffectPath).then(prefab => {
            if (isValid(this, true)) this._lunaEffectPrefab = prefab;
            return prefab;
        }).finally(() => { this._lunaEffectLoading = null; });
        return this._lunaEffectLoading;
    }

    private LoadFengYiSkill(): Promise<Prefab> {
        if (this._fengYiSkillPrefab) return Promise.resolve(this._fengYiSkillPrefab);
        if (this._fengYiSkillLoading) return this._fengYiSkillLoading;
        this._fengYiSkillLoading = this.LoadSkillPrefab(this.FengYiSkillPath).then(prefab => {
            if (isValid(this, true)) this._fengYiSkillPrefab = prefab;
            return prefab;
        }).finally(() => { this._fengYiSkillLoading = null; });
        return this._fengYiSkillLoading;
    }

    private LoadUluSkill(): Promise<Prefab> {
        if (this._uluSkillPrefab) return Promise.resolve(this._uluSkillPrefab);
        if (this._uluSkillLoading) return this._uluSkillLoading;
        this._uluSkillLoading = this.LoadSkillPrefab(this.UluSkillPath).then(prefab => {
            if (isValid(this, true)) this._uluSkillPrefab = prefab;
            return prefab;
        }).finally(() => { this._uluSkillLoading = null; });
        return this._uluSkillLoading;
    }

    private LoadSkillPrefab(path: string): Promise<Prefab> {
        // 主包只引用自身脚本；特效及 Spine 仍通过 DLC 的资源路径按需加载。
        return new Promise<Prefab>((resolve, reject) => {
            const load = (bundle: ReturnType<typeof assetManager.getBundle>): void => {
                bundle.load(path, Prefab, (error, prefab) => {
                    if (error || !prefab) reject(error ?? new Error(`技能预制体为空: ${path}`));
                    else resolve(prefab);
                });
            };
            const bundle = assetManager.getBundle('73_ZRSJZ_DLC');
            if (bundle) load(bundle);
            else assetManager.loadBundle('73_ZRSJZ_DLC', (error, loaded) => {
                if (error || !loaded) reject(error ?? new Error('73_ZRSJZ_DLC 加载失败'));
                else load(loaded);
            });
        });
    }

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        await super.ShowEquipment(equipmentName, isEquipment);
        const isGun = Array.from(ZRSJZ_WEAPONRY_TYPE.values())
            .some(weaponNames => weaponNames.includes(equipmentName));
        if (!isGun || !isEquipment) return;
    }

    ShowEntranceAnis(anis: string[]) {
        if (anis.length == 0) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(anis.shift(), false, () => { this.ShowEntranceAnis([...anis]) });
        }
    }
}
