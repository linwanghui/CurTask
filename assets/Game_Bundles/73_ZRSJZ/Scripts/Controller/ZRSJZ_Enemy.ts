import { _decorator, director, Node, Vec3 } from 'cc';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bullet } from './ZRSJZ_Bullet';
import { ZRSJZ_Game } from '../ZRSJZ_Game';

const { ccclass } = _decorator;

@ccclass('ZRSJZ_Enemy')
export class ZRSJZ_Enemy extends ZRSJZ_EnemyBase {
    protected start(): void {
        super.start();
        this.EnemySkeleton?.ShowEquipment(this.EnemyConfig.WeaponName);
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
            case "dao":
                break;
            case "hui":
                break;
        }
    }

    /**
     * 默认敌人的射击入口。
     * 后续可在此接入对象池生成 EnemyBullet，或由具体敌人子类覆写 OnAttack。
     */
    protected async Fire(): Promise<void> {
        // TODO: 接入敌人子弹预制体和伤害逻辑。
        const qkBone = this.EnemySkeleton?.Skeleton.findBone("步枪枪口");
        if (!qkBone) {
            console.warn("[ZRSJZ_Player] 找不到枪口骨骼 kaihuo/texiao");
            return;
        }

        const bullet = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/EnemyBullet");
        bullet.parent = ZRSJZ_Game.Instance.CurMap.BulletParent;
        bullet.active = true;

        // Bone.worldX/worldY 是 Spine 节点空间坐标。
        // 再经过 Spine 节点的世界矩阵，得到 Cocos 世界坐标。
        const boneLocalPos = new Vec3(qkBone.worldX, qkBone.worldY, 0);
        const muzzleWorldPos = new Vec3();
        Vec3.transformMat4(
            muzzleWorldPos,
            boneLocalPos,
            this.EnemySkeleton.node.worldMatrix,
        );

        bullet.getComponent(ZRSJZ_Bullet).Show(
            muzzleWorldPos,
            this.AttackX,
            this.AttackY,
            1000,
        );
    }
}
