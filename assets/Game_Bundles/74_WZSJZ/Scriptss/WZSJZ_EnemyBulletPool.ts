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
    private static readonly _active: Set<WZSJZ_EnemyBullet> = new Set();

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
        // 攻击时不再等待资源加载，避免动画结束或被破韧打断后补发“迟到子弹”。
        const prefab = this._prefab;
        if (!prefab) {
            void this.Prepare();
            return false;
        }
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
        this._active.add(bullet);
        WZSJZ_AudioManager.Play('枪发射', 0.4, 0.05);
        return true;
    }

    /** 战斗结束或撤离时清掉已发射但尚未命中的敌方子弹。 */
    public static RecycleAll(): void {
        for (const bullet of [...this._active]) {
            // 统一由对象池回收，不依赖组件上的公开方法。
            // Web 发布构建中如果活动集合残留了已失效的组件实例，直接调用实例方法
            // 会抛出异常并中断 GameManager.start() 后续所有系统的初始化。
            if (typeof bullet?.unscheduleAllCallbacks === "function") {
                bullet.unscheduleAllCallbacks();
            }
            this.Recycle(bullet);
        }
        this._active.clear();
    }

    /** 场景销毁时释放静态池，避免组件引用跨场景残留。 */
    public static Reset(): void {
        this.RecycleAll();
        this._pool.clear();
        this._prefab = null;
        this._loading = null;
    }

    private static SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.SetLayerRecursively(child, layer);
    }

    private static Recycle = (bullet: WZSJZ_EnemyBullet): void => {
        WZSJZ_EnemyBulletPool._active.delete(bullet);
        if (!bullet?.node?.isValid) return;
        if (typeof bullet.unscheduleAllCallbacks === "function") {
            bullet.unscheduleAllCallbacks();
        }
        bullet.node.active = false;
        WZSJZ_EnemyBulletPool._pool.put(bullet.node);
    };
}
