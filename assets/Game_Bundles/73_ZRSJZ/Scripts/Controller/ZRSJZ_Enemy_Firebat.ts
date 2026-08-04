import { _decorator, Component, director, Node, Vec3 } from 'cc';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Skill } from '../Skill/ZRSJZ_Skill';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Enemy_Firebat')
export class ZRSJZ_Enemy_Firebat extends ZRSJZ_EnemyBase {

    @property({ displayName: "武器枪口名称" })
    BoneName: string = "";

    private _isAttacking: boolean = false;

    protected onLoad(): void {
        // 喷火兵攻击时固定在原地，并锁定本次攻击开始时的瞄准方向。
        // this.CanMoveWhileAttacking = false;
        // this.CanRotateWhileAttacking = false;
        super.onLoad();
    }

    protected start(): void {
        super.start();
        this.EnemySkeleton?.ShowEquipment(this.EnemyConfig.WeaponName);
    }

    protected update(dt: number): void {
        if (this._isAttacking && !this.IsDead) {
            this.StopMoving();
            return;
        }

        super.update(dt);
    }

    protected onDisable(): void {
        this._isAttacking = false;
        super.onDisable();
    }

    public MovingAttack(_dt: number): void {
        this.BeginAttack();
    }

    public Attack(_dt: number): void {
        this.BeginAttack();
    }

    protected FindTarget(): Node {
        const players = director.getScene()?.getComponentsInChildren(ZRSJZ_Player) ?? [];
        const currentPosition = this.node.worldPosition;

        players.sort((a, b) => (
            Vec3.distance(a.node.worldPosition, currentPosition)
            - Vec3.distance(b.node.worldPosition, currentPosition)
        ));
        return players[0]?.node ?? null;
    }

    protected OnAttack(attack: string): void {
        switch (attack) {
            case "kq":
            case "gj_jjq":
                this.Fire();
                break;
        }
    }

    private BeginAttack(): void {
        if (this._isAttacking || !this.IsTargetAvailable()) {
            return;
        }

        const current = this.node.worldPosition;
        const target = this.Target.worldPosition;
        this.AttackX = target.x - current.x;
        this.AttackY = target.y - current.y;
        const distance = Math.sqrt(
            this.AttackX * this.AttackX + this.AttackY * this.AttackY,
        );

        // 每轮攻击开始前只瞄准一次，随后一直保持该方向到动画结束。
        this.UpdateAimDirection(this.AttackX, this.AttackY, distance);
        this.ClearNavigation();
        this.StopMoving();
        this._isAttacking = true;

        const attackAnimation = this.EnemyConfig.StandingAttackAnimation[0];
        this.RestartAnimation(attackAnimation, false, () => {
            if (this.IsDead || !this.node.isValid) {
                return;
            }

            this._isAttacking = false;
            if (this.EnemySkeleton) {
                this.EnemySkeleton.HasDirection = false;
            }
        });
    }

    /**
     * 默认敌人的射击入口。
     * 后续可在此接入对象池生成 EnemyBullet，或由具体敌人子类覆写 OnAttack。
     */
    protected Fire(): Promise<void> {
        // TODO: 接入敌人子弹预制体和伤害逻辑。
        const qkBone = this.EnemySkeleton?.Skeleton.findBone(this.BoneName);
        if (!qkBone) {
            console.warn("[ZRSJZ_Player] 找不到枪口骨骼 kaihuo/texiao");
            return;
        }

        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/Skill/FlamethrowerEffect").then((flame: Node) => {
            flame.parent = ZRSJZ_Game.Instance.CurMap.BulletParent;
            flame.active = true;
            // Bone.worldX/worldY 是 Spine 节点空间坐标。
            // 再经过 Spine 节点的世界矩阵，得到 Cocos 世界坐标。
            const boneLocalPos = new Vec3(qkBone.worldX, qkBone.worldY, 0);
            const muzzleWorldPos = new Vec3();
            Vec3.transformMat4(
                muzzleWorldPos,
                boneLocalPos,
                this.EnemySkeleton.node.worldMatrix,
            );

            flame.getComponent(ZRSJZ_Skill).Show(muzzleWorldPos, this.AttackX, this.AttackY, 20)
        });
    }

}


