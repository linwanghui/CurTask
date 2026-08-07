import { _decorator, CircleCollider2D, Collider2D, Color, Component, Contact2DType, director, IPhysics2DContact, Node, RigidBody2D, sp, Sprite, tween, Tween, v2, v3, Vec3 } from 'cc';
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
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Player')
export class ZRSJZ_Player extends Component {
    public readonly Speed: number = 1000;
    public readonly InitHP: number = 100;

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

    private _moveX: number = 0;
    private _moveY: number = 0;
    private _moveRadius: number = 0;
    private _aniName: string = "";
    private _isFireing: boolean = false;
    private _isSlide: boolean = false;
    private _targetBox: ZRSJZ_Box = null;
    private _isStop: boolean = false;
    private _shielding: boolean = false;
    private _knifeCount: number = 0;
    private _magazineGunID: string = "";
    /** 按实际装入顺序保存每一发子弹的名称，射击时从队首取出。 */
    private readonly _magazineAmmo: string[] = [];
    private _isReloading: boolean = false;
    private _initialMagazineRetryCount: number = 0;

    public get MagazineAmmoCount(): number {
        return this._magazineAmmo.length;
    }

    public get MagazineCapacity(): number {
        return Math.max(0, Math.floor(this.GetGunProperty("弹夹", 0)));
    }

    /** 当前备战弹药栏中尚未装入弹夹的子弹总数。 */
    public get WarehouseAmmoCount(): number {
        let count = 0;
        for (const ammoID of ZRSJZ_GameData.Instance.AmmoID) {
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

    protected onLoad(): void {
        this.RigidBody = this.getComponent(RigidBody2D);
        this.Collider = this.getComponent(CircleCollider2D);
        this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this.PlayerSkeleton = this.Skeleton.node.getComponent(ZRSJZ_PlayerSkeleton);
        this.HP = this.node.getChildByName("HP").getComponent(ZRSJZ_HP);
        this.Reloading = this.node.getChildByName("Reloading");
        this.Loading = this.Reloading.getChildByName("Loading").getComponent(Sprite);
        this.Other = this.node.getChildByName("Other");
    }

    protected start(): void {
        this.Init();

        this.Skeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number") {

                if ((event.data.name === "kq" || event.data.name === "gj_jjq") && this._isFireing && this.WeaponType === "枪") {
                    void this.Fire();
                } else if (event.data.name === "dao") {
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
        ZRSJZ_Game.Instance?.CancelEvacuation();
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
        if (ZRSJZ_Game.Instance.GamePaused || this._isStop) {
            this.RigidBody.linearVelocity = v2(0, 0);
            return;
        }
        this.FindTarget();
        this.AniSwitch();
        if (this._isSlide) {
            this.PlayerSkeleton.AttackX = Math.sign(this._moveX) != 0 ? Math.sign(this._moveX) < 0 ? -200 : 200 : this.PlayerSkeleton.AttackX;
        } else {
            this.PlayerSkeleton.AttackX = this.TargetEnemy ? this.TargetEnemy.worldPositionX - this.node.worldPositionX : Math.sign(this._moveX) != 0 ? Math.sign(this._moveX) < 0 ? -200 : 200 : this.PlayerSkeleton.AttackX;
            this.PlayerSkeleton.AttackY = this.TargetEnemy ? this.TargetEnemy.worldPositionY - this.node.worldPositionY : 0;
        }
        this.RigidBody.linearVelocity = v2(this._moveX * dt * this.CurSpeed * this._moveRadius, this._moveY * dt * this.CurSpeed * this._moveRadius);
    }

    Init() {
        const gunID = ZRSJZ_GameData.Instance.WeaponryID[0];
        const knifeID = ZRSJZ_GameData.Instance.WeaponryID[4];
        const hasGun = !!gunID && !!ZRSJZ_GameData.Instance.PropData[gunID];
        const hasKnife = !!knifeID && !!ZRSJZ_GameData.Instance.PropData[knifeID];
        this._curKnifeName = hasKnife ? ZRSJZ_GameData.Instance.PropData[knifeID].Name : "";
        this.CurSpeed *= 1 + ZRSJZ_GameData.Instance.GetGymMoveSpeedBonusRate();
        this.WeaponType = hasGun ? "枪" : (hasKnife ? "刀" : "");
        this.PlayerSkeleton.IsKnife = this.WeaponType === "刀";
        if (hasGun) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
        }


        //血量初始化
        this.MaxHP = (this.InitHP + ZRSJZ_GameData.Instance.GetResearchMaxHPBonus()) * (1 + (ZRSJZ_UIManager.ZRSJZ_DLC ? ZRSJZ_GameData.Instance.GetBoxroomAttributeBonusRate("生命") : 0));
        this.CurHP = this.MaxHP;
        this.HP.Init(this.MaxHP);
        this.HP.Show(this.CurHP);
        this.PlayerSkeleton.AttackX = 200;
        this.FillInitialMagazineWhenReady();

        //速度初始化
        this.MaxSpeed = this.Speed * (1 + ZRSJZ_GameData.Instance.GetGymMoveSpeedBonusRate());
        this.CurSpeed = this.MaxSpeed;
    }

    //#region 技能
    Skill(skillName: string, dirX?: number, dirY?: number, radius?: number) {
        if (this._isSlide) return;
        switch (skillName) {
            case "激光":
                this._isStop = true;
                const isKnife = this.PlayerSkeleton.IsKnife;
                if (isKnife) {
                    this.PlayerSkeleton.IsKnife = false;
                    const weaponName: string = ZRSJZ_GameData.Instance.WeaponryID[0] ? ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[0]].Name : "CN8-突击步枪";
                    this.PlayerSkeleton.ShowEquipment(weaponName);
                }
                this.PlayAni(ZRSJZ_ANI.Idle_Q);
                ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/Skill/LaserEffect").then((laser: Node) => {
                    laser.parent = this.node.parent.parent;
                    laser.active = true;
                    laser.getComponent(ZRSJZ_Skill).Show(this.getMuzzlePos(), this.PlayerSkeleton.AttackX, this.PlayerSkeleton.AttackY, 20, () => {
                        if (isKnife) {
                            this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[4]].Name);
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
    Move(x: number, y: number, radius: number) {
        if (this._isStop) return;
        this._moveX = x;
        this._moveY = y;
        this._moveRadius = 1;
        if (x != 0) {
            this.PlayerSkeleton.SetPlayerDir(x / Math.abs(x))
        }
    }
    //#region 攻击
    Attack(fireing: boolean) {
        if (this._isSlide || this._isStop) return;
        if (!fireing) {
            this.WeaponType === "枪" ? this.PlayAni(ZRSJZ_ANI.Idle_Q) : this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            if (this._isFireing) {
                this._isFireing = false;
            }
            this._isKnifeAttack = false;
            return;
        }
        if (this.WeaponType === "枪") {
            this._moveX == 0 && this._moveY == 0 ? this.PlayAni(this.PlayerSkeleton.GunType === "步枪" ? ZRSJZ_ANI.Attack_Idle_Q : ZRSJZ_ANI.Attack_Idle_Q2) : this.PlayAni(this.PlayerSkeleton.GunType === "步枪" ? ZRSJZ_ANI.Attack_Move_Q : ZRSJZ_ANI.Attack_Move_Q2);
            if (!this._isFireing) {
                this._isFireing = true;
            }
        } else {
            this._isKnifeAttack = true;
            this.onKnifeAttack();
        }
    }

    async Fire() {
        this.EnsureMagazineMatchesGun();
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && (this.WeaponType !== "枪" || this._magazineAmmo.length <= 0)) {
            this.StopFiring();
            return;
        }


        const ammoName = ZRSJZ_Game.Instance.UnlimitedFirepower ? this._magazineAmmo.length > 0 ? this._magazineAmmo[0] : "1级子弹" : this._magazineAmmo.length > 0 ? this._magazineAmmo.shift() : "";
        const gunDamage = this.GetGunProperty("伤害", 0);//本身伤害
        const bulletDamage = ZRSJZ_PROP_PROPERTY.get(ammoName)?.["增伤"] ?? 0;//子弹攻击力加成
        const totalGunDamageRate = 1 + ZRSJZ_GameData.Instance.GetFiringRangeAttackBonusRate() + (ZRSJZ_UIManager.ZRSJZ_DLC ? ZRSJZ_GameData.Instance.GetBoxroomAttributeBonusRate("枪械伤害") : 0);
        const bulletRange = this.GetGunProperty("射程", 0);
        const bulletLevel = this.GetBulletLevel(ammoName);

        // 在任何异步资源加载前从队首取弹，防止连续动画事件重复使用同一发子弹。
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && this._magazineAmmo.length <= 0) {
            this.StopFiring();
        }

        const muzzleWorldPos = this.getMuzzlePos();
        if (!ZRSJZ_Game.Instance.UnlimitedFirepower && (!muzzleWorldPos || bulletRange <= 0)) {
            return;
        }

        const attackX = this.PlayerSkeleton.AttackX;
        const attackY = this.PlayerSkeleton.AttackY;
        const finalDamage = Math.round(gunDamage * (bulletDamage / 100 + totalGunDamageRate));

        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/MuzzleEffect").then((muzzleEffect: Node) => {
            muzzleEffect.parent = this.node;
            muzzleEffect.getComponent(ZRSJZ_MuzzleEffect).Show(muzzleWorldPos, attackX, attackY);
        })

        const spawnBullet = (dirX: number, dirY: number): void => {
            ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/PlayerBullet").then((bullet: Node) => {
                bullet.parent = ZRSJZ_Game.Instance.CurMap.BulletParent;
                bullet.active = true;
                bullet.getComponent(ZRSJZ_Bullet).Show(
                    muzzleWorldPos,
                    dirX,
                    dirY,
                    bulletRange,
                    finalDamage,
                    bulletLevel,
                );
            });
        };

        spawnBullet(attackX, attackY);

        if (ZRSJZ_WEAPONRY_TYPE.get("散弹枪")?.includes(this.PlayerSkeleton.WeaponryName)) {
            //散射两个子弹
            const offsetAnge: number = 10;
            const offsetRadian = offsetAnge * Math.PI / 180;
            const cos = Math.cos(offsetRadian);
            const sin = Math.sin(offsetRadian);

            spawnBullet(
                attackX * cos - attackY * sin,
                attackX * sin + attackY * cos,
            );
            spawnBullet(
                attackX * cos + attackY * sin,
                -attackX * sin + attackY * cos,
            );
        }

    }

    private _isKnifeAttack: boolean = false;
    onKnifeAttack() {
        this._aniName = "";
        this._moveX == 0 && this._moveY == 0 ?
            this.PlayAni(this._knifeCount++ % 2 == 0 ? ZRSJZ_ANI.Attack_Idle_D2 : ZRSJZ_ANI.Attack_Idle_D3, false, () => {
                this.onKnifeAttack();
            }) :
            this.PlayAni(this._knifeCount++ % 2 == 0 ? ZRSJZ_ANI.Attack_Move_D2 : ZRSJZ_ANI.Attack_Move_D3, false, () => {
                this.onKnifeAttack();
            });
    }

    KnifeAttack(skillRange: number) {
        const damage: number = ZRSJZ_PROP_PROPERTY.get(this._curKnifeName).伤害;

        const finalDamage = Math.round(
            damage * (1 + ZRSJZ_GameData.Instance.GetFiringRangeAttackBonusRate() +
                (ZRSJZ_UIManager.ZRSJZ_DLC ? ZRSJZ_GameData.Instance.GetBoxroomAttributeBonusRate("枪械伤害") : 0))
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
        if (this._moveX == 0 && this._moveY == 0) {
            if (this._aniName == ZRSJZ_ANI.Walk_D) {
                this.PlayAni(ZRSJZ_ANI.Idle_D1);
            } else if (this._aniName == ZRSJZ_ANI.Walk_Q) {
                this.PlayAni(ZRSJZ_ANI.Idle_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_D2) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2, false, () => { this.onKnifeAttack() });
                } else {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
                }
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_D3) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2, false, () => { this.onKnifeAttack() });
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
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2, false, () => { this.onKnifeAttack() });
                } else {
                    this.PlayAni(ZRSJZ_ANI.Attack_Move_D2);
                }
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_D3) {
                if (this._isKnifeAttack) {
                    this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2, false, () => { this.onKnifeAttack() });
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
    SwitchWeapon(weaponType: string) {
        const weaponryIndex = weaponType === "枪" ? 0 : (weaponType === "刀" ? 4 : -1);
        const weaponID = weaponryIndex >= 0
            ? ZRSJZ_GameData.Instance.WeaponryID[weaponryIndex]
            : "";
        if (!weaponID || !ZRSJZ_GameData.Instance.PropData[weaponID]) {
            console.warn(`[ZRSJZ_Player] 未装备${weaponType}，已忽略切换请求`);
            return;
        }

        this.WeaponType = weaponType;
        if (this.WeaponType === "枪") {
            this.EnsureMagazineMatchesGun();
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
            this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[0]].Name);
        } else if (this.WeaponType === "刀") {
            this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            this._curKnifeName = ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[4]].Name
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
    }

    //#region 复活
    Resurgence() {
        this.CurHP = this.MaxHP;
        this.HP.Show(this.CurHP);
        this.CurSpeed = this.MaxSpeed;
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/RecoverEffect").then((effect: Node) => {
            effect.parent = this.node;
            effect.active = true;
            effect.getComponent(ZRSJZ_Effect_CB).Show(this.node.worldPosition);
        });
        this.Skill("护盾");

        if (!this.PlayerSkeleton.IsKnife) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
        }
    }

    //#region 寻找敌人
    protected FindTarget() {
        // const attackRange = this.WeaponType === "枪"
        //     ? this.GetGunProperty("射程", 500)
        //     : 500;
        const attackRange = 2000;
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
        const madeHarm = Math.floor((this._shielding ? 0.1 : 1) * harm);//实际照成的伤害
        this.CurHP -= madeHarm;
        if (this.CurHP <= 0) {
            this.CurHP = 0;
            ZRSJZ_Game.Instance.CancelEvacuation();
            ZRSJZ_Game.Instance.GamePaused = true;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, false);
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, 0, 0, 0);
            ZRSJZ_UIManager.Instance.PrepareForDeath();
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.死亡弹窗);
            this.PlayAni(ZRSJZ_ANI.SW, false);
        } else {
            this.beHitEffect();
        }
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/HarmEffect").then((effect: Node) => {
            effect.parent = ZRSJZ_Game.Instance.CurMap.BulletParent;
            effect.active = true;
            effect.getComponent(ZRSJZ_HarmEffect).Show(this.node.worldPosition.clone(), madeHarm);
        })
        this.HP.Show(this.CurHP);
    }

    private beHitEffect() {
        this.unschedule(this.changeColor);
        this.PlayerSkeleton.Skeleton.color = new Color(255, 0, 0, 255);
        this.scheduleOnce(this.changeColor, 0.04);
        Tween.stopAllByTarget(this.PlayerSkeleton.node);
        tween(this.PlayerSkeleton.node)
            .to(0.013, { eulerAngles: v3(0, 0, 5) }, { easing: 'sineInOut' })
            .to(0.013, { eulerAngles: v3(0, 0, -5) }, { easing: 'sineInOut' })
            .to(0.013, { eulerAngles: v3(0, 0, 0) }, { easing: 'sineInOut' })
            .start();
    }

    private changeColor() {
        this.PlayerSkeleton.Skeleton.color = new Color(255, 255, 255, 255);
    }

    //#region 换弹
    Reload(fill: number, isCancelled: boolean = false) {
        if (isCancelled) {
            this._isReloading = false;
            this.Reloading.active = false;
            this.Loading.fillRange = 1;
            return;
        }

        if (fill <= 0) {
            if (!this.CanReload()) {
                return;
            }
            this._isReloading = true;
        }

        this.Reloading.active = this._isReloading && fill < 1;
        this.Loading.fillRange = fill;
        if (this._isReloading && fill >= 1) {
            this.FillMagazine();
            this._isReloading = false;
            this.Reloading.active = false;
        }
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

        const ammoIDs = ZRSJZ_GameData.Instance.AmmoID.slice();
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
            ZRSJZ_GameData.Instance.SetAmmoID(ammoIDs);
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
        const gunID = ZRSJZ_GameData.Instance.WeaponryID[0] ?? "";
        if (gunID === this._magazineGunID) {
            return;
        }

        this._magazineGunID = gunID;
        this._magazineAmmo.length = 0;
        this._isReloading = false;
    }

    private GetGunProperty(propertyName: string, defaultValue: number): number {
        const gunID = ZRSJZ_GameData.Instance.WeaponryID[0];
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
        if (this.WeaponType === "枪") {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        }
    }

    //#region 滑动
    Slide() {
        if (this._isStop) return;
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
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this._targetBox);
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Door)) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, otherCollider.node?.getComponent(ZRSJZ_Door));
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node.name.startsWith("撤离点")) {
            //开始撤离
            ZRSJZ_Game.Instance.StartEvacuation(otherCollider.node.name);
        }
    }

    EndContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Box) && otherCollider.node?.getComponent(ZRSJZ_Box) == this._targetBox) {
            const target = otherCollider.node?.getComponent(ZRSJZ_Box);
            if (target && target === this._targetBox) {
                this._targetBox.CheckCancel();
                this._targetBox = null;
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this._targetBox);
            }
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node?.getComponent(ZRSJZ_Door)) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_DOOR, null);
        } else if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node.name.startsWith("撤离点")) {
            //撤离中断
            ZRSJZ_Game.Instance.CancelEvacuation();
        }
    }

    //#region 获取枪口位置
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
