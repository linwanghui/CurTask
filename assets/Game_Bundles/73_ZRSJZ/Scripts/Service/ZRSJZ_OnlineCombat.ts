import { Node, Vec3 } from 'cc';
import { ZRSJZ_OnlineService as Online } from './ZRSJZ_OnlineService';

/** 战斗桥接点。DLC 可以注册表现，主包不引用 DLC 脚本。 */
export class ZRSJZ_OnlineCombat {
    public static Peer: Node = null;
    public static PetPose: (() => any) = null;
    public static Applying = false;
    public static SuppressNative = false;
    public static get Replica(): boolean { return Online.Battle && !Online.BattleHost; }
    public static get Stopped(): boolean { return Online.Battle && Online.BattleEnded; }
    public static SendArea(origin: Vec3, range: number, damage: number): void {
        if (Online.BattleHost && !this.Applying) Online.Combat({ kind: 'area', x: origin.x, y: origin.y, range, damage });
    }
    public static ChooseTarget(origin: Vec3, local: Node): Node {
        const peer = this.Peer;
        if (!Online.BattleHost || !peer?.isValid || !peer.activeInHierarchy || Online.PeerPose?.dead) return local;
        return !local || Vec3.distance(origin, peer.worldPosition) < Vec3.distance(origin, local.worldPosition) ? peer : local;
    }
}
