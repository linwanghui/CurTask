import { Collider2D, isValid, Node, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';

type PetReceiver = { alive: () => boolean; hit: (damage: number) => void;
    backpack?: () => { playerIndex: number; slots: number } | null };

/** 敌方伤害的玩家/宠物入口；宠物主动注册，不从主包加载或导入DLC资源。 */
export class ZRSJZ_FriendlyDamageService {
    private static readonly pets = new Map<Node, PetReceiver>();

    public static RegisterPet(node: Node, alive: () => boolean, hit: (damage: number) => void,
        backpack?: () => { playerIndex: number; slots: number } | null): void {
        this.pets.set(node, { alive, hit, backpack });
    }
    public static UnregisterPet(node: Node): void { this.pets.delete(node); }

    /** 查询真实跟随宠物；独立于战斗暂停判断，打开弹窗暂停时仍可查看。 */
    public static GetFollowingPetBackpack(playerIndex: number): { slots: number } | null {
        for (const [node, pet] of this.pets) {
            if (!isValid(node, true)) { this.pets.delete(node); continue; }
            if (!node.activeInHierarchy) continue;
            const info = pet.backpack?.();
            if (info && info.playerIndex === playerIndex) return { slots: info.slots };
        }
        return null;
    }

    private static CanDamage(damage: number): boolean {
        const game = ZRSJZ_Game.Instance;
        return !!game && !game.GamePaused && !game.IsGameFinished && Number.isFinite(damage) && damage > 0;
    }

    public static DamagePetsInRange(origin: Vec3, range: number, damage: number): void {
        if (!this.CanDamage(damage) || range < 0) return;
        for (const [node, receiver] of this.pets) {
            if (!isValid(node, true)) { this.pets.delete(node); continue; }
            if (!node.activeInHierarchy || !receiver.alive()) continue;
            // 宠物根节点常在脚底；同时检查实际碰撞体中心，与玩家Other判定保持一致。
            const inRange = Vec3.distance(origin, node.worldPosition) <= range
                || node.getComponentsInChildren(Collider2D).some(c => {
                    if (!c.enabled || !c.node.activeInHierarchy) return false;
                    const box = c.worldAABB;
                    return Math.hypot(origin.x - (box.x + box.width / 2), origin.y - (box.y + box.height / 2)) <= range;
                });
            if (inRange) receiver.hit(damage);
        }
    }

    public static DamageArea(origin: Vec3, range: number, damage: number): void {
        if (!this.CanDamage(damage) || range < 0) return;
        // 先结算宠物，避免玩家致死触发结算/暂停后漏掉同一轮范围伤害。
        this.DamagePetsInRange(origin, range, damage);
        for (const player of ZRSJZ_Game.Instance.Players) {
            if (!isValid(player, true) || !player.node.activeInHierarchy || player.IsDead) continue;
            if (Vec3.distance(origin, player.node.worldPosition) <= range
                || (isValid(player.Other, true) && Vec3.distance(origin, player.Other.worldPosition) <= range)) {
                player.BeHit(damage);
            }
        }
    }

    public static DamageNodes(nodes: Node[], damage: number): void {
        const isPet = (node: Node): boolean => {
            for (let current = node; isValid(current, true); current = current.parent) {
                if (this.pets.has(current)) return true;
            }
            return false;
        };
        const hitNodes = new Set<Node>();
        const ordered = nodes.map(node => ({ node, pet: isPet(node) })).sort((a, b) => Number(b.pet) - Number(a.pet));
        for (const item of ordered) this.DamageNode(item.node, damage, hitNodes);
    }

    /** 从命中的子碰撞体向上寻找受伤主体；同一轮多射线用同一个hitNodes集合去重。 */
    public static DamageNode(node: Node, damage: number, hitNodes = new Set<Node>()): boolean {
        if (!this.CanDamage(damage)) return false;
        for (let current = node; isValid(current, true); current = current.parent) {
            if (!current.activeInHierarchy) return false;
            const pet = this.pets.get(current);
            const player = current.getComponent(ZRSJZ_Player);
            if (!pet && !player) continue;
            if (hitNodes.has(current)) return false;
            if (pet ? !pet.alive() : player.IsDead) return false;
            hitNodes.add(current);
            if (pet) pet.hit(damage);
            else player.BeHit(damage);
            return true;
        }
        return false;
    }
}
