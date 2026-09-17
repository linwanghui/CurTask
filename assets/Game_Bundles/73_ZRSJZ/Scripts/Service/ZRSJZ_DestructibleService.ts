import { isValid, Node, Vec3 } from 'cc';

/** 攻击入口只依赖注册表，不加载 DLC 资源。 */
export class ZRSJZ_DestructibleService {
    private static receivers = new Map<Node, (damage: number) => void>();

    static Register(node: Node, hit: (damage: number) => void): void { this.receivers.set(node, hit); }
    static Unregister(node: Node): void { this.receivers.delete(node); }

    static HitNode(node: Node, damage: number): boolean {
        if (!Number.isFinite(damage) || damage <= 0) return false;
        for (let current = node; isValid(current, true); current = current.parent) {
            const hit = this.receivers.get(current);
            if (hit && current.activeInHierarchy) { hit(damage); return true; }
        }
        return false;
    }

    static HitArea(origin: Vec3, radius: number, damage: number): void {
        if (!Number.isFinite(radius) || radius < 0) return;
        for (const node of Array.from(this.receivers.keys())) {
            if (!isValid(node, true)) { this.receivers.delete(node); continue; }
            if (Vec3.distance(origin, node.worldPosition) <= radius) this.HitNode(node, damage);
        }
    }
}
