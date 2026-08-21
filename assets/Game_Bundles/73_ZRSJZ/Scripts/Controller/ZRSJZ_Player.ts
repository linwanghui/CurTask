import { ZRSJZ_BoxroomService } from "../Service/ZRSJZ_BoxroomService";
import { ZRSJZ_FacilityService } from "../Service/ZRSJZ_FacilityService";
import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, CircleCollider2D, Collider2D, Color, Component, Contact2DType, director, IPhysics2DContact, Node, RigidBody2D, sp, Sprite, tween, Tween, v2, v3, Vec2, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI, ZRSJZ_INVENTORY, ZRSJZ_PANEL, ZRSJZ_PROP_PROPERTY, ZRSJZ_TIER, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_PlayerSkeleton } from './ZRSJZ_PlayerSkeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bullet } from './ZRSJZ_Bullet';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_HP } from '../UI/ZRSJZ_HP';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_MuzzleEffect } from '../Effect/ZRSJZ_MuzzleEffect';
import { ZRSJZ_Effect_CB } from '../Effect/ZRSJZ_Effect_CB';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_Skill } from '../Skill/ZRSJZ_Skill';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_HarmEffect } from '../Effect/ZRSJZ_HarmEffect';
import { ZRSJZ_Door } from '../Unit/ZRSJZ_Door';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Player')
export class ZRSJZ_Player extends Component {
    /** 0 为玩家1，1 为玩家2；所有战斗输入和装备读取都以此隔离。 */
    PlayerIndex: number = 0;
    public readonly Speed: number = 1500;
    public readonly InitHP: number = 100;
    /** 普通跑步与攻击跑步的关键姿势存在少量相位差，按 Spine 常用的 30 FPS 偏移两帧。 */

    RigidBody: RigidBody2D = null;
    Collider: CircleCollider2D = null;
    Skeleton: sp.Skeleton = null;
    WeaponType: string = "";

    PlayerSkeleton: ZRSJZ_PlayerSkeleton = null;
    HP: ZRSJZ_HP = null;
    Other: Node = null;

    MaxHP: number = 100;
    CurHP: number = 100;
    MaxSpeed: number = 1000;
    CurSpeed: number = 1000;

    TargetEnemy: Node = null;
    TargetRange: number = 2000;
    Reloading: Node = null;
    Loading: Sprite = null;
    private _bulletProgressNode: Node = null;
    private _bulletProgressSprite: Sprite = null;

    private _moveX: number = 0;
    private _moveY: number = 0;
    private _moveRadius: number = 0;
    private _aniName: string = "";
    private _isFireing: boolean = false;
    private _waitingFirstGunShot: boolean = false;
    private _gunAttackAnimationPlayedOnce: boolean = false;
    private _gunAttackAnimationActive: boolean = false;
    private _preparingGunAttack: boolean = false;
    private _reservedGunBullet: Node = null;
    private _reservedGunAmmoName: string = "";
    private _gunAttackRequestId: number = 0;
    private _lastValidMuzzlePos: Vec3 = null;
    private _isSlide: boolean = false;
    private _targetBox: ZRSJZ_Box = null;
    private _isStop: boolean = false;
    private _shielding: boolean = false;
    private _knifeCount: number = 0;
    private _knifeAttackIndex: number = 2;
    private _magazineGunID: string = "";
    /** 按实际装入顺序保存每一发子弹的名称，射击时从队首取出。 */
    private readonly _magazineAmmo: string[] = [];
    private _isReloading: boolean = false;
    private _initialMagazineRetryCount: number = 0;
    private _curScale: number = 0.5;

    public get MagazineAmmoCount(): number {
        return this._magazineAmmo.length;
    }

    public get IsDead(): boolean {
        return this.CurHP <= 0 && ZRSJZ_GameData.Instance.CurMap !== "新手村";
    }

    public get MagazineCapacity(): number {
        return Math.max(0, Math.floor(this.GetGunProperty("弹夹", 0)));
    }

    /** 当前备战弹药栏中尚未装入弹夹的子弹总数。 */
    public get WarehouseAmmoCount(): number {
        let count = 0;
        for (const ammoID of ZRSJZ_InventoryService.GetAmmoIDs(this.PlayerIndex)) {
            const ammoData = ZRSJZ_GameData.Instance.PropData[ammoID];
            if (ammoData?.PropType === "弹药") {
                count += Math.max(0, Math.floor(ammoData.CurCount));
            }
        }
        return count;
    }

    //是否锁定敌人
    public get IsLockEnemy(): boolean {
        return this.TargetEnemy != null;
    }
    //是否能滑动
    public get IsSlide(): boolean {
        return !this._isStop;
    }

    //是否能释放技能
    public get IsSkill(): boolean {
        return !this._isSlide;
    }

    //是否能切换武器
    public get IsSwitch(): boolean {
        return !this._isSlide;
    }

    protected onLoad(): void {
        this.RigidBody = this.getComponent(RigidBody2D);
        this.Collider = this.getComponent(CircleCollider2D);
        this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this.PlayerSkeleton = this.Skeleton.node.getComponent(ZRSJZ_PlayerSkeleton);
        this.HP = this.node.getChildByName("HP").getComponent(ZRSJZ_HP);
        // Reloading/Loading 只负责显示换弹耗时。
        this.Reloading = this.node.getChildByName("Reloading");
        this.Loading = this.Reloading?.getChildByName("Loading")?.getComponent(Sprite) ?? null;

        // Bullet 只负责常驻显示当前弹匣数量 / 弹匣容量。
        this._bulletProgressNode = this.node.getChildByName("Bullet");
        const bulletProgressChild = this._bulletProgressNode?.getChildByName("Progress")
            ?? this._bulletProgressNode?.getChildByName("Loading");
        const bulletProgressRootSprite = this._bulletProgressNode?.getComponent(Sprite);
        this._bulletProgressSprite = bulletProgressChild?.getComponent(Sprite)
            ?? (bulletProgressRootSprite?.type === Sprite.Type.FILLED
                ? bulletProgressRootSprite
                : null)
            ?? this._bulletProgressNode?.getComponentsInChildren(Sprite).find(
                sprite => sprite.type === Sprite.Type.FILLED,
            )
            ?? null;
        if (this._bulletProgressNode) this._bulletProgressNode.active = true;
        this.Other = this.node.getChildByName("Other");
    }

    protected start(): void {
        this.PlayerSkeleton.CurPlayerIndex = this.PlayerIndex;
        this.Init();

        this.PlayerSkeleton.HandSkeleton.setEventListener((trackEntry, event) => {
            if (typeof event === "number") return;

            if (
                this._waitingFirstGunShot
                && this.WeaponType === "枪"
                && (event.data.name === "kq" || event.data.name === "gj_jjq")
            ) {
                this.FireReservedGunBullet();
            } else if (this._knifeAnimationPlaying) {
                if (event.data.name === "dao") {
                    this.KnifeAttack(200);
                } else if (event.data.name === "hui") {
                    this.KnifeAttack(250);
                }
            }
        });
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, this.Attack, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, this.Reload, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.Slide, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SKILL, this.Skill, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RESURGENCE, this.Resurgence, this);
        this.Collider.on(Contact2DType.BEGIN_CONTACT, this.BeginContact, this)
        this.Collider.on(Contact2DType.END_CONTACT, this.EndContact, this)
    }

    protected onDisable(): void {
        this.CancelGunAttackState();
        ZRSJZ_Game.Instance?.CancelEvacuation(this.PlayerIndex);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, this.Attack, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RELOAD, this.Reload, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.Slide, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SKILL, this.Skill, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RESURGENCE, this.Resurgence, this);
        this.Collider.off(Contact2DType.BEGIN_CONTACT, this.BeginContact, this)
        this.Collider.off(Contact2DType.END_CONTACT, this.EndContact, this)
    }

    protected update(dt: number): void {
        this.RefreshBulletProgress();
        if (ZRSJZ_Game.Instance.GamePaused || this._isStop) {
            this.RigidBody.linearVelocity = v2(0, 0);
            return;
        }
        this.FindTarget();
        this.UpdateAutomaticFire(dt);
        this.AniSwitch();
        if (this._isSlide) {
            this.PlayerSkeleton.AttackX = Math.sign(this._moveX) != 0 ? Math.sign(this._moveX) < 0 ? -200 : 200 : this.PlayerSkeleton.AttackX;
            let moveVec: Vec2 = v2(this._moveX, this._moveY)
            if (moveVec.x == 0 && moveVec.y == 0) {
                Vec2.normalize(moveVec, v2(this.PlayerSkeleton.AttackX, this.PlayerSkeleton.AttackY))
            }
            this.RigidBody.linearVelocity = v2(moveVec.x * dt * this.CurSpeed * this._moveRadius, moveVec.y * dt * this.CurSpeed * this._moveRadius);
        } else {
            this.PlayerSkeleton.AttackX = this.TargetEnemy ? this.TargetEnemy.worldPositionX - this.node.worldPositionX : Math.sign(this._moveX) != 0 ? Math.sign(this._moveX) < 0 ? -200 : 200 : this.PlayerSkeleton.AttackX;
            this.PlayerSkeleton.AttackY = this.TargetEnemy ? this.TargetEnemy.worldPositionY - this.node.worldPositionY : 0;
            this.RigidBody.linearVelocity = v2(this._moveX * dt * this.CurSpeed * this._moveRadius, this._moveY * dt * this.CurSpeed * this._moveRadius);
        }
    }

    Init() {
        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex);
        const gunID = weaponryIDs[0];
        const knifeID = weaponryIDs[4];
        const hasGun = !!gunID && !!ZRSJZ_GameData.Instance.PropData[gunID];
        const hasKnife = !!knifeID && !!ZRSJZ_GameData.Instance.PropData[knifeID];
        this._curKnifeName = hasKnife ? ZRSJZ_GameData.Instance.PropData[knifeID].Name : "";
        this.CurSpeed *= 1 + ZRSJZ_FacilityService.GetGymMoveSpeedBonusRate();
        this.WeaponType = hasGun ? "枪" : (hasKnife ? "刀" : "");
        this.PlayerSkeleton.IsKnife = this.WeaponType === "刀";
        if (hasGun) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
        }


        //血量初始化
        this.MaxHP = (this.InitHP + ZRSJZ_FacilityService.GetResearchMaxHPBonus()) * (1 + (ZRSJZ_UIManager.ZRSJZ_DLC ? ZRSJZ_BoxroomService.GetBoxroomAttributeBonusRate("生命") : 0));
        this.CurHP = this.MaxHP;
        this.HP.Init(this.MaxHP);
        this.HP.Show(this.CurHP);
        this.PlayerSkeleton.AttackX = 200;
        if (this._bulletProgressNode) this._bulletProgressNode.active = true;
        this.RefreshBulletProgress();
        this.FillInitialMagazineWhenReady();

        //速度初始化
        this.MaxSpeed = this.Speed * (1 + ZRSJZ_FacilityService.GetGymMoveSpeedBonusRate());
        this.CurSpeed = this.MaxSpeed;

        this._curScale = this.node.scale.x;
    }

    //#region 技能
    Skill(skillName: string, dirX?: number, dirY?: number, radius?: number, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        if (this._isSlide || this._gunAttackAnimationActive) return;
        this.CancelGunAttackState();
        this.CancelKnifeAttackState();
        switch (skillName) {
            case "激光":
                this._isStop = true;
                const isKnife = this.PlayerSkeleton.IsKnife;
                if (isKnife) {
                    this.PlayerSkeleton.IsKnife = false;
                    const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex);
                    const weaponName: string = weaponryIDs[0] ? ZRSJZ_GameData.Instance.PropData[weaponryIDs[0]].Name : "CN8-突击步枪";
                    this.PlayerSkeleton.ShowEquipment(weaponName);
                }
                this.PlayAni(ZRSJZ_ANI.Idle_Q);
                ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/Skill/LaserEffect").then((laser: Node) => {
                    laser.parent = this.node.parent.parent;
                    laser.active = true;
                    laser.getComponent(ZRSJZ_Skill).Show(this.getMuzzlePos(), this.PlayerSkeleton.AttackX, this.PlayerSkeleton.AttackY, 20, () => {
                        if (isKnife) {
                            const knifeID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[4];
                            this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[knifeID].Name);
                            this.PlayAni(ZRSJZ_ANI.Idle_D1);
                            this.PlayerSkeleton.IsKnife = true;
                        }
                        this._isStop = false;
                    })
                }).catch((error) => {
                    this._isStop = false;
                    console.error('[ZRSJZ_Player] 技能特效加载失败:', error);
                })
                break;
            case "轰炸":
                const cb: Function = () => {
                    ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/Skill/BombEffect").then((bomb: Node) => {
                        if (!this.IsLockEnemy) {
                            this.unschedule(cb);
                            return;
                        }
                        bomb.parent = this.node.parent.parent;
                        bomb.active = true;
                        bomb.getComponent(ZRSJZ_Skill).Show(this.TargetEnemy.worldPosition.clone(), 0, 0, 20);
                    })
                }
                cb();
                this.schedule(cb, 1, 2, 0);
                break;
            case "护盾":
                this._shielding = true;
                ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/Skill/ShieldEffect").then((laser: Node) => {
                    laser.parent = this.node;
                    laser.active = true;
                    laser.getComponent(ZRSJZ_Skill).Show(this.node.worldPosition.clone(), 0, 0, 0, () => {
                        this._shielding = false;
                    })
                }).catch((error) => {
                    this._isStop = false;
                    console.error('[ZRSJZ_Player] 技能特效加载失败:', error);
                })
                break;
        }
    }

    //#region 移动
    Move(x: number, y: number, radius: number, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        if (this._isStop) return;
        this._moveX = x;
        this._moveY = y;
        this._moveRadius = 1;
        if (x != 0) {
            this.PlayerSkeleton.SetPlayerDir(x / Math.abs(x))
        }
        if (this.IsGunAttackVisualActive()) {
            this.UpdateGunBodyAnimation();
        } else if ((this._isKnifeAttack || this._knifeAnimationPlaying) && this.WeaponType === "刀") {
            this.UpdateKnifeBodyAnimation();
        }
    }
    //#region 攻击
    Attack(fireing: boolean, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        if (this._isSlide || this._isStop) return;
        if (!fireing) {
            if (this.WeaponType === "刀") {
                this._isKnifeAttack = false;
                if (!this._knifeAnimationPlaying) this.RestoreKnifeLocomotion();
                return;
            }
            if (this.WeaponType === "枪") {
                this._isFireing = false;
                // 快速单击也要等第一轮开枪动画完整播放后再恢复手部待机。
                if (!this._gunAttackAnimationActive || (this._gunAttackAnimationPlayedOnce && !this._waitingFirstGunShot)) {
                    this.RestoreGunLocomotion();
                } else {
                    this.UpdateGunBodyAnimation();
                }
            } else {
                this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            }
            this._isKnifeAttack = false;
            return;
        }
        if (this.WeaponType === "枪") {
            if (!this._isFireing) {
                this._isFireing = true;
                // 冷却期间不播放假开枪动画；持续按住时等冷却结束再开始。
                void this.BeginGunAttackAnimation();
            }
        } else {
            this._isKnifeAttack = true;
            this.UpdateKnifeBodyAnimation();
            this.TryStartKnifeAttack();
        }
    }

    private FireReservedGunBullet(): void {
        // 主子弹只能由手部 Spine 的开枪事件调用此方法生成。
        if (!this._waitingFirstGunShot || !this._reservedGunBullet) return;

        const bullet = this._reservedGunBullet;
        const ammoName = this._reservedGunAmmoName;
        this._reservedGunBullet = null;
        this._reservedGunAmmoName = "";
        this._waitingFirstGunShot = false;

        const bulletRange = this.GetGunProperty("射程", 0);
        let attackX = this.PlayerSkeleton.AttackX;
        let attackY = this.PlayerSkeleton.AttackY;
        if (attackX === 0 && attackY === 0) {
            attackX = (this.PlayerSkeleton.Facing || 1) * 200;
            attackY = 0;
        }
        const gunDamage = this.GetGunProperty("伤害", 0);//本身伤害
        const bulletDamage = ZRSJZ_PROP_PROPERTY.get(ammoName)?.["增伤"] ?? 0;//子弹攻击力加成
        const totalGunDamageRate = 1 + ZRSJZ_FacilityService.GetFiringRangeAttackBonusRate() + (ZRSJZ_UIManager.ZRSJZ_DLC ? ZRSJZ_BoxroomService.GetBoxroomAttributeBonusRate("枪械伤害") : 0);
        const bulletLevel = this.GetBulletLevel(ammoName);
        const finalDamage = Math.round(gunDamage * (bulletDamage / 100 + totalGunDamageRate));

        const showBullet = (targetBullet: Node, dirX: number, dirY: number): Vec3 | null => {
            try {
                const bulletParent = ZRSJZ_Game.Instance?.CurMap?.BulletParent;
                const bulletComponent = targetBullet?.getComponent(ZRSJZ_Bullet);
                if (!targetBullet?.isValid || !bulletParent?.isValid || !bulletComponent) return null;

                const spawnWorldPos = this.GetReliableMuzzlePos();

                targetBullet.parent = bulletParent;
                targetBullet.active = true;
                bulletComponent.Show(
                    this.GetReliableMuzzlePos() || spawnWorldPos,
                    dirX,
                    dirY,
                    bulletRange,
                    finalDamage,
                    bulletLevel,
                );
                return spawnWorldPos.clone();
            } catch (error) {
                console.error("[ZRSJZ_Player] 玩家子弹创建失败", error);
                if (targetBullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(targetBullet);
                return null;
            }
        };

        const mainBulletSpawnPos = showBullet(bullet, attackX, attackY);
        if (!mainBulletSpawnPos) {
            if (!ZRSJZ_Game.Instance.UnlimitedFirepower && ammoName) {
                this._magazineAmmo.unshift(ammoName);
            }
            console.error("[ZRSJZ_Player] 主子弹创建失败，弹药已退回弹匣");
            return;
        }

        // 主子弹确认生成后再显示枪口和播放声音，避免出现只有开火表现却没有子弹。
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/MuzzleEffect").then((muzzleEffect: Node) => {
            if (!muzzleEffect?.isValid) return;
            muzzleEffect.parent = this.node;
            muzzleEffect.getComponent(ZRSJZ_MuzzleEffect)?.Show(mainBulletSpawnPos, attackX, attackY);
        }).catch(error => console.error("[ZRSJZ_Player] 枪口特效创建失败", error));

        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && this._magazineAmmo.length <= 0) {
            this.StopFiring();
        }

        if (ZRSJZ_WEAPONRY_TYPE.get("散弹枪")?.includes(this.PlayerSkeleton.WeaponryName)) {
            //散射两个子弹
            const offsetAnge: number = 10;
            const offsetRadian = offsetAnge * Math.PI / 180;
            const cos = Math.cos(offsetRadian);
            const sin = Math.sin(offsetRadian);

            void this.SpawnExtraBullet(attackX * cos - attackY * sin, attackX * sin + attackY * cos, bulletRange, finalDamage, bulletLevel);
            void this.SpawnExtraBullet(attackX * cos + attackY * sin, -attackX * sin + attackY * cos, bulletRange, finalDamage, bulletLevel);
            ZRSJZ_AudioManager.Instance.PlaySound("狙击枪枪声");
        } else {
            ZRSJZ_AudioManager.Instance.PlaySound("枪声");
        }

    }

    private _isKnifeAttack: boolean = false;
    private _knifeAnimationPlaying: boolean = false;

    private TryStartKnifeAttack(): void {
        if (!this._isKnifeAttack || this._knifeAnimationPlaying || this.WeaponType !== "刀") return;

        this._knifeAnimationPlaying = true;
        this.PlayerSkeleton.HandAttackAnimationLocked = true;
        this._knifeAttackIndex = this._knifeCount++ % 2 === 0 ? 2 : 3;
        const attackAnimation = this._knifeAttackIndex === 2
            ? ZRSJZ_ANI.Attack_Idle_D2
            : ZRSJZ_ANI.Attack_Idle_D3;
        this.UpdateKnifeBodyAnimation();
        this.PlayerSkeleton.PlayHandAni(attackAnimation, false, () => this.FinishKnifeAttackCycle());
    }

    private FinishKnifeAttackCycle(): void {
        this._knifeAnimationPlaying = false;
        if (this._isKnifeAttack) {
            this.TryStartKnifeAttack();
        } else if (this.WeaponType === "刀") {
            this.PlayerSkeleton.HandAttackAnimationLocked = false;
            this.RestoreKnifeLocomotion();
        }
    }

    private CancelKnifeAttackState(): void {
        this._isKnifeAttack = false;
        this._knifeAnimationPlaying = false;
        this.PlayerSkeleton.HandAttackAnimationLocked = false;
    }

    KnifeAttack(skillRange: number) {
        ZRSJZ_AudioManager.Instance.PlaySound("近战攻击");
        const damage: number = ZRSJZ_PROP_PROPERTY.get(this._curKnifeName).伤害;

        const finalDamage = Math.round(
            damage * (1 + ZRSJZ_FacilityService.GetFiringRangeAttackBonusRate() +
                (ZRSJZ_UIManager.ZRSJZ_DLC ? ZRSJZ_BoxroomService.GetBoxroomAttributeBonusRate("枪械伤害") : 0))
        );
        let enemys = director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? [];
        enemys = enemys.filter(enemy => !enemy.IsDead);

        // 节点自身朝上 300
        const up = new Vec3();
        Vec3.transformQuat(up, new Vec3(0, 1, 0), this.node.worldRotation);
        up.normalize().multiplyScalar(150);

        // 最终位置 = 原位置 + 朝前 200 + 自身朝上 300
        const targetPosition = new Vec3();
        Vec3.add(targetPosition, this.node.worldPosition.clone(), up);

        targetPosition.x += Math.sign(this.PlayerSkeleton.AttackX) * 150;

        // ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/MuzzleEffect").then((muzzleEffect: Node) => {
        //     muzzleEffect.parent = this.node;
        //     muzzleEffect.getComponent(ZRSJZ_MuzzleEffect).Show(targetPosition, this.PlayerSkeleton.AttackX, this.PlayerSkeleton.AttackY);
        // })

        enemys.forEach(enemy => {
            if (Vec3.distance(targetPosition, enemy.node.worldPosition) < skillRange || Vec3.distance(targetPosition, enemy.Other?.worldPosition) < skillRange) {
                enemy.BeHit(finalDamage);
            }
        })
    }

    //#region 动画
    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        if (aniName == this._aniName) return;
        this._aniName = aniName;
        this.PlayerSkeleton.PlayAni(aniName, loop, cb);
    }

    //动画切换
    AniSwitch() {
        // 挥刀只占用手部 Spine，身体仍按输入实时切换待机/移动。
        if ((this._isKnifeAttack || this._knifeAnimationPlaying) && this.WeaponType === "刀") {
            this.UpdateKnifeBodyAnimation();
            return;
        }
        // 开枪时身体只表现移动/待机；手部攻击动画由 Attack 独立控制。
        if (this.IsGunAttackVisualActive()) {
            this.UpdateGunBodyAnimation();
            return;
        }
        if (this._moveX == 0 && this._moveY == 0) {
            if (this._aniName == ZRSJZ_ANI.Walk_D) {
                this.PlayAni(ZRSJZ_ANI.Idle_D1);
            } else if (this._aniName == ZRSJZ_ANI.Walk_Q) {
                this.PlayAni(ZRSJZ_ANI.Idle_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_D2) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
                } else {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
                }
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_D3) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
                } else {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D3);
                }
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_Q) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_Q2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q2);
            }
        } else if (this._moveX != 0 || this._moveY != 0) {
            if (this._aniName == ZRSJZ_ANI.Idle_D1 || this._aniName == ZRSJZ_ANI.Idle_D2) {
                this.PlayAni(ZRSJZ_ANI.Walk_D);
            } else if (this._aniName == ZRSJZ_ANI.Idle_Q) {
                this.PlayAni(ZRSJZ_ANI.Walk_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_D2) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
                } else {
                    this.PlayAni(ZRSJZ_ANI.Attack_Move_D2);
                }
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_D3) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
                } else {
                    this.PlayAni(ZRSJZ_ANI.Attack_Move_D3);
                }
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_Q) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_Q2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_Q2);
            }
        }
    }

    //#region 武器切换
    private _curKnifeName: string = "";
    SwitchWeapon(weaponType: string, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        if (this._gunAttackAnimationActive) return;
        const weaponryIndex = weaponType === "枪" ? 0 : (weaponType === "刀" ? 4 : -1);
        const weaponID = weaponryIndex >= 0
            ? ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[weaponryIndex]
            : "";
        if (!weaponID || !ZRSJZ_GameData.Instance.PropData[weaponID]) {
            console.warn(`[ZRSJZ_Player] 未装备${weaponType}，已忽略切换请求`);
            return;
        }

        this.CancelKnifeAttackState();
        this.CancelGunAttackState();
        this.WeaponType = weaponType;
        if (this.WeaponType === "枪") {
            this.EnsureMagazineMatchesGun();
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
            const gunID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[0];
            this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[gunID].Name);
        } else if (this.WeaponType === "刀") {
            this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            const knifeID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[4];
            this._curKnifeName = ZRSJZ_GameData.Instance.PropData[knifeID].Name
            this.PlayerSkeleton.ShowEquipment(this._curKnifeName);
        }
        this.PlayerSkeleton.IsKnife = this.WeaponType === "刀";
    }


    //#region 血量恢复
    async Recover(hp: number) {
        this.CurHP = Math.min(this.MaxHP, this.CurHP + hp);
        this.HP.Show(this.CurHP);
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/RecoverEffect").then((effect: Node) => {
            effect.parent = this.node;
            effect.active = true;
            effect.getComponent(ZRSJZ_Effect_CB).Show(this.node.worldPosition);
        });
        ZRSJZ_AudioManager.Instance.PlaySound("恢复");
    }

    //#region 复活
    Resurgence(playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        this.CurHP = this.MaxHP;
        this._isStop = false;
        this.HP.Show(this.CurHP);
        this.CurSpeed = this.MaxSpeed;
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/RecoverEffect").then((effect: Node) => {
            effect.parent = this.node;
            effect.active = true;
            effect.getComponent(ZRSJZ_Effect_CB).Show(this.node.worldPosition);
        });
        this.Skill("护盾");
        this._isSlide = false;
        this._aniName = "";
        if (!this.PlayerSkeleton.IsKnife) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
        }
        ZRSJZ_Game.Instance?.OnPlayerResurrected(this.PlayerIndex);
    }

    //#region 寻找敌人
    protected FindTarget() {
        // const attackRange = this.WeaponType === "枪"
        //     ? this.GetGunProperty("射程", 500)
        //     : 500;
        const attackRange = 1500;
        if (this.TargetEnemy && !this.TargetEnemy.getComponent(ZRSJZ_EnemyBase).IsDead && Vec3.distance(this.TargetEnemy.worldPosition, this.node.worldPosition) <= 500) {
            return;
        }

        let enemys = director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? [];
        const currentPosition = this.node.worldPosition;
        enemys = enemys.filter(enemy => !enemy.IsDead);
        enemys.sort((a, b) => (
            Vec3.distance(a.node.worldPosition, currentPosition)
            - Vec3.distance(b.node.worldPosition, currentPosition)
        ));
        if (
            enemys.length > 0
            && Vec3.distance(enemys[0].node.worldPosition, this.node.worldPosition) <= attackRange
        ) {
            this.TargetEnemy = enemys[0].node;
        } else {
            this.TargetEnemy = null;
        }
    }

    //#region 受到打击
    BeHit(harm: number) {
        if (this.CurHP <= 0) return;
        const incomingHarm = Math.max(0, harm);
        const damageMultiplier = this._shielding
            ? 0.1
            : 1 - this.GetEquippedDamageReductionRate();
        const madeHarm = incomingHarm > 0
            ? Math.max(1, Math.round(damageMultiplier * incomingHarm))
            : 0;
        this.CurHP -= madeHarm;
        if (this.CurHP <= 0) {
            this.CurHP = 0;
            if (ZRSJZ_GameData.Instance.CurMap !== "新手村") {
                this.CancelGunAttackState();
                this.CancelKnifeAttackState();
                this._isStop = true;
                ZRSJZ_Game.Instance.OnPlayerDied(this.PlayerIndex);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false, this.PlayerIndex,);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, 0, 0, 0, this.PlayerIndex,);
                ZRSJZ_UIManager.Instance.PrepareForDeath(this.PlayerIndex);
                if (
                    ZRSJZ_GameData.Instance.CurModel == "2p"
                    && !ZRSJZ_Game.Instance.IsUsingSinglePlayerLayout(this.PlayerIndex)
                ) {
                    //双人模式
                    ZRSJZ_UIManager.Instance.ShowPlayerPanel(ZRSJZ_PANEL.双人模式死亡弹窗, this.PlayerIndex, this.PlayerIndex);
                } else {
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.死亡弹窗, this.PlayerIndex);
                }
                this.PlayAni(ZRSJZ_ANI.SW, false);
                ZRSJZ_AudioManager.Instance.PlaySound("击杀");
            }
        } else {
            this.beHitEffect();
            const audioName = this._shielding
                ? "格挡"
                : "受击";
            ZRSJZ_AudioManager.Instance.PlaySound(audioName);
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, 6);
        }
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/HarmEffect").then((effect: Node) => {
            effect.parent = ZRSJZ_Game.Instance.CurMap.BulletParent;
            effect.active = true;
            effect.getComponent(ZRSJZ_HarmEffect).Show(this.node.worldPosition.clone(), madeHarm);
        })
        this.HP.Show(this.CurHP);
    }

    /** 头盔与防弹衣减伤相加，最终上限为 50%，避免高阶装备完全免伤。 */
    private GetEquippedDamageReductionRate(): number {
        let reductionPercent = 0;
        for (const equipmentIndex of [1, 2]) {
            const equipmentID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[equipmentIndex];
            const equipmentName = ZRSJZ_GameData.Instance.PropData[equipmentID]?.Name;
            reductionPercent += equipmentName
                ? ZRSJZ_PROP_PROPERTY.get(equipmentName)?.["减伤"] ?? 0
                : 0;
        }
        return Math.min(0.5, Math.max(0, reductionPercent / 100));
    }

    private beHitEffect() {
        this.unschedule(this.changeColor);
        this.PlayerSkeleton.Skeleton.color = new Color(255, 0, 0, 255);
        this.scheduleOnce(this.changeColor, 0.04);
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.02, { scale: v3(this._curScale + 0.03, this._curScale + 0.03, 1) }, { easing: 'linear' })
            .to(0.02, { scale: v3(this._curScale, this._curScale, 1) }, { easing: 'linear' })
            .start();
    }

    private changeColor() {
        this.PlayerSkeleton.Skeleton.color = new Color(255, 255, 255, 255);
    }

    //#region 换弹
    Reload(fill: number, isCancelled: boolean = false, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        if (isCancelled) {
            this._isReloading = false;
            if (this.Reloading) this.Reloading.active = false;
            if (this.Loading) this.Loading.fillRange = 1;
            this.RefreshBulletProgress();
            return;
        }

        if (fill <= 0) {
            if (!this.CanReload()) {
                return;
            }
            this._isReloading = true;
        }

        const safeFill = Math.min(1, Math.max(0, fill));
        if (this.Reloading) {
            this.Reloading.active = this._isReloading && safeFill < 1;
        }
        if (this.Loading) this.Loading.fillRange = safeFill;
        this.RefreshBulletProgress();
        if (this._isReloading && fill >= 1) {
            this.FillMagazine();
            this.RefreshBulletProgress();
            this._isReloading = false;
            if (this.Reloading) this.Reloading.active = false;
        }
    }

    /** 玩家身上的 Bullet 填充只表示真实弹匣占比，不表示换弹耗时。 */
    private RefreshBulletProgress(): void {
        if (!this._bulletProgressSprite) return;
        if (this._bulletProgressNode) this._bulletProgressNode.active = true;
        const capacity = this.MagazineCapacity;
        this._bulletProgressSprite.fillRange = capacity > 0
            ? Math.min(1, Math.max(0, this.MagazineAmmoCount / capacity))
            : 0;
    }

    public CanReload(): boolean {
        if (this.WeaponType !== "枪") {
            return false;
        }

        this.EnsureMagazineMatchesGun();
        const capacity = this.MagazineCapacity;
        if (capacity <= 0 || this._magazineAmmo.length >= capacity) {
            return false;
        }

        return this.WarehouseAmmoCount > 0;
    }

    private FillMagazine(): void {
        this.EnsureMagazineMatchesGun();
        const capacity = this.MagazineCapacity;
        if (capacity <= 0 || this._magazineAmmo.length >= capacity) {
            return;
        }

        const ammoIDs = ZRSJZ_InventoryService.GetAmmoIDs(this.PlayerIndex).slice();
        let remaining = capacity - this._magazineAmmo.length;
        let isChanged = false;

        // 严格从弹药栏第一个格子开始获取，当前格耗尽后再读取后一个格子。
        for (let index = 0; index < ammoIDs.length && remaining > 0; index++) {
            const ammoID = ammoIDs[index];
            const ammoData = ZRSJZ_GameData.Instance.PropData[ammoID];
            if (
                !ammoData
                || ammoData.PropType !== "弹药"
                || ammoData.CurCount <= 0
            ) {
                continue;
            }

            const takeCount = Math.min(remaining, ammoData.CurCount);
            for (let count = 0; count < takeCount; count++) {
                this._magazineAmmo.push(ammoData.Name);
            }
            ammoData.CurCount -= takeCount;
            remaining -= takeCount;
            isChanged = true;

            if (ammoData.CurCount <= 0) {
                delete ZRSJZ_GameData.Instance.PropData[ammoID];
                ammoIDs[index] = "";
            }
        }

        if (isChanged) {
            ZRSJZ_InventoryService.SetAmmoID(ammoIDs, this.PlayerIndex);
        }
    }

    /** 等待弹药栏完成 AmmoID 整理后，只执行一次进入游戏的默认装填。 */
    private FillInitialMagazineWhenReady(): void {
        if (this.WeaponType !== "枪") {
            return;
        }

        const ammoInventoryReady = ZRSJZ_UIManager.Instance.InventoryMap
            .has(ZRSJZ_INVENTORY.弹药);
        if (ammoInventoryReady || this._initialMagazineRetryCount >= 40) {
            this.FillMagazine();
            return;
        }

        this._initialMagazineRetryCount++;
        this.scheduleOnce(() => this.FillInitialMagazineWhenReady(), 0.05);
    }

    private EnsureMagazineMatchesGun(): void {
        const gunID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[0] ?? "";
        if (gunID === this._magazineGunID) {
            return;
        }

        this._magazineGunID = gunID;
        this._magazineAmmo.length = 0;
        this._isReloading = false;
    }

    private GetGunProperty(propertyName: string, defaultValue: number): number {
        const gunID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerIndex)[0];
        const gunName = ZRSJZ_GameData.Instance.PropData[gunID]?.Name;
        const value = gunName
            ? ZRSJZ_PROP_PROPERTY.get(gunName)?.[propertyName]
            : undefined;
        return Number.isFinite(value) ? value : defaultValue;
    }

    private GetBulletLevel(ammoName: string): number {
        const match = /^(\d+)级子弹$/.exec(ammoName);
        return match ? Math.max(1, Number(match[1])) : 1;
    }

    private StopFiring(): void {
        this._isFireing = false;
        this._waitingFirstGunShot = false;
        if (this.WeaponType === "枪") {
            if (this._gunAttackAnimationPlayedOnce) {
                this.RestoreGunLocomotion();
            } else {
                this.UpdateGunBodyAnimation();
            }
        }
    }

    /** 长按攻击时按武器射速持续开火，不再依赖 Spine 动画事件是否循环。 */
    private UpdateAutomaticFire(dt: number): void {
        if (this.WeaponType !== "枪") return;

        if (this._isFireing && !this._gunAttackAnimationActive) {
            void this.BeginGunAttackAnimation();
            return;
        }

        if (this._waitingFirstGunShot) {
            return;
        }
        // 每一发都必须先启动一轮开枪动画，不能由计时器直接生成子弹。
        if (this._isFireing && !this._gunAttackAnimationActive) {
            void this.BeginGunAttackAnimation();
        }
    }

    private async SpawnExtraBullet(dirX: number, dirY: number, range: number, harm: number, bulletLevel: number): Promise<void> {
        let bullet: Node = null;
        try {
            bullet = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/PlayerBullet");
            const bulletParent = ZRSJZ_Game.Instance?.CurMap?.BulletParent;
            const bulletComponent = bullet?.getComponent(ZRSJZ_Bullet);
            if (!bullet?.isValid || !bulletParent?.isValid || !bulletComponent) {
                if (bullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(bullet);
                return;
            }
            const spawnWorldPos = this.GetReliableMuzzlePos();
            bullet.parent = bulletParent;
            bullet.active = true;
            bulletComponent.Show(this.GetReliableMuzzlePos() || spawnWorldPos, dirX, dirY, range, harm, bulletLevel);
        } catch (error) {
            if (bullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(bullet);
            console.error("[ZRSJZ_Player] 散弹额外弹丸创建失败", error);
        }
    }

    private async BeginGunAttackAnimation(): Promise<void> {
        if (!this._isFireing || this._gunAttackAnimationActive || this._preparingGunAttack || this.WeaponType !== "枪") return;

        this.EnsureMagazineMatchesGun();
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && this._magazineAmmo.length <= 0) {
            this.StopFiring();
            return;
        }
        if (this.GetGunProperty("射程", 0) <= 0) {
            console.warn("[ZRSJZ_Player] 当前枪械射程无效，本轮不播放动画也不消耗弹药");
            return;
        }

        this._preparingGunAttack = true;
        const requestId = ++this._gunAttackRequestId;
        let bullet: Node = null;
        try {
            bullet = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/PlayerBullet");
        } catch (error) {
            console.error("[ZRSJZ_Player] 主子弹预取异常，本轮不播放开枪动画", error);
        } finally {
            if (requestId === this._gunAttackRequestId) this._preparingGunAttack = false;
        }
        if (requestId !== this._gunAttackRequestId) {
            if (bullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(bullet);
            return;
        }
        const bulletParent = ZRSJZ_Game.Instance?.CurMap?.BulletParent;
        if (
            !bullet?.isValid
            || !bullet.getComponent(ZRSJZ_Bullet)
            || !bulletParent?.isValid
            || !this.PlayerSkeleton?.QKBone
        ) {
            if (bullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(bullet);
            console.warn("[ZRSJZ_Player] 主子弹预取失败，本轮不播放开枪动画");
            return;
        }
        if (!this._isFireing || this.WeaponType !== "枪") {
            ZRSJZ_PoolManager.Instance.PutNode(bullet);
            return;
        }

        this._reservedGunBullet = bullet;
        this._reservedGunAmmoName = ZRSJZ_Game.Instance.UnlimitedFirepower
            ? (this._magazineAmmo[0] ?? "1级子弹")
            : (this._magazineAmmo.shift() ?? "");

        this._gunAttackAnimationActive = true;
        this.PlayerSkeleton.HandAttackAnimationLocked = true;
        this._waitingFirstGunShot = true;
        this._gunAttackAnimationPlayedOnce = false;
        this.UpdateGunBodyAnimation();
        this.PlayerSkeleton.PlayGunHandAni(
            this.PlayerSkeleton.GunType === "步枪"
                ? ZRSJZ_ANI.Attack_Idle_Q
                : ZRSJZ_ANI.Attack_Idle_Q2,
            this.GetGunProperty("射速", 600),
            () => this.OnGunAttackAnimationComplete(),
        );
    }

    private CancelGunAttackState(): void {
        this._gunAttackRequestId++;
        this._isFireing = false;
        this._waitingFirstGunShot = false;
        this._gunAttackAnimationPlayedOnce = true;
        this._gunAttackAnimationActive = false;
        this.PlayerSkeleton.HandAttackAnimationLocked = false;
        this.PlayerSkeleton.ResetHandAnimationSpeed();
        this._preparingGunAttack = false;
        if (this._reservedGunBullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(this._reservedGunBullet);
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && this._reservedGunAmmoName) {
            this._magazineAmmo.unshift(this._reservedGunAmmoName);
        }
        this._reservedGunBullet = null;
        this._reservedGunAmmoName = "";
    }

    private OnGunAttackAnimationComplete(): void {
        this._gunAttackAnimationPlayedOnce = true;
        // 子弹只由 Spine 开枪事件生成；动画完成不再补发子弹。
        if (this._waitingFirstGunShot) {
            console.error("[ZRSJZ_Player] 开枪动画未触发 kq/gj_jjq 事件，本轮取消且退回弹药");
            if (this._reservedGunBullet?.isValid) ZRSJZ_PoolManager.Instance.PutNode(this._reservedGunBullet);
            if (!ZRSJZ_Game.Instance.UnlimitedFirepower && this._reservedGunAmmoName) {
                this._magazineAmmo.unshift(this._reservedGunAmmoName);
            }
            this._reservedGunBullet = null;
            this._reservedGunAmmoName = "";
            this._waitingFirstGunShot = false;
        }
        this._gunAttackAnimationActive = false;
        this.PlayerSkeleton.HandAttackAnimationLocked = false;
        if (!this._isFireing && this.WeaponType === "枪") {
            this.RestoreGunLocomotion();
        }
    }

    private IsGunAttackVisualActive(): boolean {
        return this.WeaponType === "枪"
            && (this._isFireing || this._gunAttackAnimationActive);
    }

    private UpdateGunBodyAnimation(): void {
        const isRifle = this.PlayerSkeleton.GunType === "步枪";
        const bodyAnimation = this._moveX == 0 && this._moveY == 0
            ? (isRifle ? ZRSJZ_ANI.Attack_Idle_Q : ZRSJZ_ANI.Attack_Idle_Q2)
            : (isRifle ? ZRSJZ_ANI.Attack_Move_Q : ZRSJZ_ANI.Attack_Move_Q2);
        if (bodyAnimation === this._aniName) return;
        const keepMoveProgress = this.IsGunMoveBodyAnimation(this._aniName)
            && this.IsGunMoveBodyAnimation(bodyAnimation);
        this._aniName = bodyAnimation;
        if (keepMoveProgress) {
            this.PlayerSkeleton.PlayBodyAniKeepingProgress(bodyAnimation);
        } else {
            this.PlayerSkeleton.PlayBodyAni(bodyAnimation);
        }
    }

    private UpdateKnifeBodyAnimation(): void {
        const bodyAnimation = this._moveX == 0 && this._moveY == 0
            ? (this._knifeAttackIndex === 2 ? ZRSJZ_ANI.Attack_Idle_D2 : ZRSJZ_ANI.Attack_Idle_D3)
            : (this._knifeAttackIndex === 2 ? ZRSJZ_ANI.Attack_Move_D2 : ZRSJZ_ANI.Attack_Move_D3);
        if (bodyAnimation === this._aniName) return;
        this._aniName = bodyAnimation;
        this.PlayerSkeleton.PlayBodyAni(bodyAnimation);
    }

    private RestoreKnifeLocomotion(): void {
        const animation = this._moveX == 0 && this._moveY == 0
            ? ZRSJZ_ANI.Idle_D1
            : ZRSJZ_ANI.Walk_D;
        this._aniName = animation;
        this.PlayerSkeleton.PlayBodyAni(animation);
        this.PlayerSkeleton.PlayHandAni(animation);
    }

    /** 停火后让身体和手部重新回到一致的持枪移动状态。 */
    private RestoreGunLocomotion(): void {
        const animation = this._moveX == 0 && this._moveY == 0
            ? ZRSJZ_ANI.Idle_Q
            : ZRSJZ_ANI.Walk_Q;
        if (animation !== this._aniName) {
            const keepMoveProgress = this.IsGunMoveBodyAnimation(this._aniName)
                && this.IsGunMoveBodyAnimation(animation);
            this._aniName = animation;
            if (keepMoveProgress) {
                this.PlayerSkeleton.PlayBodyAniKeepingProgress(animation);
            } else {
                this.PlayerSkeleton.PlayBodyAni(animation);
            }
        }
        this.PlayerSkeleton.PlayHandAni(animation);
    }

    private IsGunMoveBodyAnimation(animation: string): boolean {
        return animation === ZRSJZ_ANI.Walk_Q
            || animation === ZRSJZ_ANI.Attack_Move_Q
            || animation === ZRSJZ_ANI.Attack_Move_Q2;
    }

    //#region 滑动
    Slide(playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        if (this._isStop || this._gunAttackAnimationActive) return;
        this.CancelGunAttackState();
        this.CancelKnifeAttackState();
        ZRSJZ_AudioManager.Instance.PlaySound("滑铲音效");

        this.CurSpeed += 1500;
        this._isSlide = true;
        const anis: string[] = this.WeaponType === "枪" ? [ZRSJZ_ANI.HC_Q, ZRSJZ_ANI.Idle_Q] : [ZRSJZ_ANI.HC_D, ZRSJZ_ANI.Idle_D1];
        this.PlayAni(anis[0], false, () => {
            this._isSlide = false;
            this.CurSpeed -= 1500;
            this.PlayAni(anis[1]);
        })
    }

    //#region 碰撞检测
    BeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        // if (this._targetBox) return;
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Box) && otherCollider.node?.getComponent(ZRSJZ_Box) != this._targetBox) {
            if (this._targetBox) {
                this._targetBox.CheckCancel();
            }
            this._targetBox = otherCollider.node?.getComponent(ZRSJZ_Box);
            this._targetBox.Check();
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this._targetBox, this.PlayerIndex);
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Door)) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, otherCollider.node?.getComponent(ZRSJZ_Door), this.PlayerIndex);
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node.name.startsWith("撤离点")) {
            //开始撤离
            ZRSJZ_Game.Instance.StartEvacuation(otherCollider.node.name, this.PlayerIndex);
        }
    }

    EndContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Box) && otherCollider.node?.getComponent(ZRSJZ_Box) == this._targetBox) {
            const target = otherCollider.node?.getComponent(ZRSJZ_Box);
            if (target && target === this._targetBox) {
                this._targetBox.CheckCancel();
                this._targetBox = null;
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this._targetBox, this.PlayerIndex);
            }
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Door)) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, null, this.PlayerIndex);
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node.name.startsWith("撤离点")) {
            //撤离中断
            ZRSJZ_Game.Instance.CancelEvacuation(this.PlayerIndex);
        }
    }

    //#region 获取枪口位置
    private GetReliableMuzzlePos(): Vec3 {
        const currentMuzzlePos = this.getMuzzlePos();
        if (currentMuzzlePos) {
            this._lastValidMuzzlePos = currentMuzzlePos.clone();
            return currentMuzzlePos;
        }

        // 已经播放开枪动画并预留子弹时，即使本帧 Spine 骨骼暂时不可读，也必须补出主子弹。
        if (this._lastValidMuzzlePos) return this._lastValidMuzzlePos.clone();
        return this.node.worldPosition.clone();
    }

    private getMuzzlePos() {
        const qkBone = this.PlayerSkeleton?.QKBone;
        if (!qkBone) {
            console.warn("[ZRSJZ_Player] 找不到枪口骨骼 kaihuo/texiao");
            return;
        }
        // Bone.worldX/worldY 是 Spine 节点空间坐标。
        // 再经过 Spine 节点的世界矩阵，得到 Cocos 世界坐标。
        const boneLocalPos = new Vec3(qkBone.worldX, qkBone.worldY, 0);
        const muzzleWorldPos = new Vec3();
        Vec3.transformMat4(
            muzzleWorldPos,
            boneLocalPos,
            this.PlayerSkeleton.node.worldMatrix,
        );
        return muzzleWorldPos;
    }

}
