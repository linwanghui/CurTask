import { Node, sp, UITransform } from 'cc';

/** 来自各 Spine「框」附件透明内孔的美术标定（骨骼本地坐标），不包含外侧装饰/粒子。 */
const OPENINGS: Readonly<Record<string, { x: number; y: number; width: number; height: number }>> = {
    '6': { x: 0, y: -0.26, width: 128, height: 122 },
    '7': { x: 0.27, y: -1.04, width: 134, height: 125 },
    '8': { x: -0.48, y: 0.29, width: 132, height: 130 },
    '9': { x: -0.5, y: 0.32, width: 131, height: 132 },
    '10': { x: 0.14, y: -1.43, width: 132, height: 131 },
};

export class ZRSJZ_AvatarFrameFit {
    public static Calculate(id: string, width: number, height: number): { scale: number; x: number; y: number } | null {
        const opening = OPENINGS[id];
        if (!opening || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
        // 内孔略压住头像边缘，避免透明缝隙；统一等比缩放，不拉伸骨骼动画。
        const scale = Math.min(width / opening.width, height / opening.height) * 0.99;
        return { scale, x: -opening.x * scale, y: -opening.y * scale };
    }

    /** 头像与头像框必须为同父节点；尺寸和缩放每次从实际头像读取。 */
    public static AroundAvatar(skeleton: sp.Skeleton, id: string, avatar: Node): void {
        const transform = avatar?.getComponent(UITransform);
        if (!transform || !skeleton?.node?.isValid || avatar.parent !== skeleton.node.parent) return;
        const sx = avatar.scale.x, sy = avatar.scale.y;
        const fit = this.Calculate(id, transform.width * Math.abs(sx), transform.height * Math.abs(sy));
        if (!fit) return;
        skeleton.node.setScale(fit.scale, fit.scale, 1);
        skeleton.node.setPosition(avatar.position.x + (0.5 - transform.anchorX) * transform.width * sx + fit.x,
            avatar.position.y + (0.5 - transform.anchorY) * transform.height * sy + fit.y, skeleton.node.position.z);
    }
}
