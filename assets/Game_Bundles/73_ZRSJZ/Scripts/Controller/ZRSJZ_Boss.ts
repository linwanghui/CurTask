import { _decorator, director, Vec3, Node, setPropertyEnumType } from 'cc';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_BossBase } from './ZRSJZ_BossBase';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_MuzzleEffect } from '../Effect/ZRSJZ_MuzzleEffect';

const { ccclass, property } = _decorator;

/**
 * 默认 Boss 实现。
 * 普通攻击和技能伤害都由 Spine 动画事件进入 OnAttack 后执行。
 */
@ccclass('ZRSJZ_Boss')
export class ZRSJZ_Boss extends ZRSJZ_BossBase {

    @property
    FireBoneName: string = "";

    protected FindTarget(): Node {
        const players = director.getScene()?.getComponentsInChildren(ZRSJZ_Player) ?? [];
        const currentPosition = this.node.worldPosition;

        players.sort((a, b) => (
            Vec3.distance(a.node.worldPosition, currentPosition)
            - Vec3.distance(b.node.worldPosition, currentPosition)
        ));
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player.getComponent(ZRSJZ_Player)?.IsDead) {
                return player.node;
            }
        }
        return null;
    }

    protected OnAttack(eventName: string): void {
        const attack = this.ConsumeAttackEvent(eventName);
        if (!attack) {
            return;
        }
        switch (attack.Name) {
            case "普通攻击":
                this._attack(this._getStartPos(this.FireBoneName), attack.DamageRange, attack.Damage);
                break;
            case "超级陀螺":
                this._attack(this.node.worldPosition, attack.DamageRange, attack.Damage);
                break;
            case "死亡剪刀":
                this._attack(this._getStartPos(this.FireBoneName), attack.DamageRange, attack.Damage);
                break;
            case "超级炸弹":
                this._attack(this.node.worldPosition, attack.DamageRange, attack.Damage);
                break;
        }
    }

    private _getStartPos(boneName: string): Vec3 {
        const qkBone = this.EnemySkeleton.Skeleton.findBone(boneName);
        // Bone.worldX/worldY 是 Spine 节点空间坐标。
        // 再经过 Spine 节点的世界矩阵，得到 Cocos 世界坐标。
        const boneLocalPos = new Vec3(qkBone.worldX, qkBone.worldY, 0);
        const muzzleWorldPos = new Vec3();
        Vec3.transformMat4(
            muzzleWorldPos,
            boneLocalPos,
            this.EnemySkeleton.node.worldMatrix,
        );

        return muzzleWorldPos;
    }

    private _attack(startPos: Vec3, damageRange: number, damage: number) {
        // 普攻和技能伤害统一在 OnAttack 中由各自的 Spine 动画事件触发。
        const players = director.getScene()?.getComponentsInChildren(ZRSJZ_Player) ?? [];
        for (const player of players) {
            if (!player.node.activeInHierarchy) continue;
            if (Vec3.distance(startPos, player.node.worldPosition) <= damageRange || Vec3.distance(startPos, player.Other.worldPosition) <= damageRange) {
                player.BeHit(damage * this.DamageMultiplier);
            }
        }
    }
}
