import { instantiate, Node, NodePool, Prefab, Vec3 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EnemyBullet } from './WZSJZ_EnemyBullet';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';

/** 所有敌方远程单位共享的通用子弹池。 */
export class WZSJZ_EnemyBulletPool {
    private static _prefab: Prefab = null;
    private static _loading: Promise<Prefab> = null;
    private static readonly _pool: NodePool = new NodePool();

    public static async Prepare(): Promise<Prefab> {
        if (this._prefab) return this._prefab;
        if (!this._loading) {
            this._loading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.EnemyCommonBullet.PrefabPath,
            ).then((prefab) => {
                this._prefab = prefab;
                while (this._pool.size()
                    < WZSJZ_Constant.ObjectPool.EnemyCommonBulletPrewarm) {
                    this._pool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._loading = null;
                console.error("[WZSJZ] 敌对通用子弹加载失败。", error);
                return null;
            });
        }
        return this._loading;
    }

    public static async Spawn(
        parent: Node,
        origin: Vec3,
        wall: WZSJZ_Wall,
        damage: number,
    ): Promise<boolean> {
        const prefab = await this.Prepare();
        if (!prefab || !parent?.isValid || !wall?.IsAlive) return false;
        const node = this._pool.get() || instantiate(prefab);
        node.setParent(parent);
        node.setWorldPosition(origin);
        this.SetLayerRecursively(node, parent.layer);
        const bullet = node.getComponent(WZSJZ_EnemyBullet);
        if (!bullet?.Initialize(
            wall,
            Math.max(0, damage),
            WZSJZ_Constant.EnemyCommonBullet.Speed,
            WZSJZ_Constant.EnemyCommonBullet.HitDistance,
            WZSJZ_Constant.EnemyCommonBullet.HitEffectDuration,
            WZSJZ_EnemyBulletPool.Recycle,
        )) {
            node.active = false;
            this._pool.put(node);
            return false;
        }
        WZSJZ_AudioManager.Play('枪发射', 0.4, 0.05);
        return true;
    }

    private static SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.SetLayerRecursively(child, layer);
    }

    private static Recycle = (bullet: WZSJZ_EnemyBullet): void => {
        if (!bullet?.node?.isValid) return;
        bullet.node.active = false;
        WZSJZ_EnemyBulletPool._pool.put(bullet.node);
    };
}
