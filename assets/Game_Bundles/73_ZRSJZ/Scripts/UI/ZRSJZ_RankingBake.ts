import { sp } from 'cc';
import { ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE, ZRSJZ_KNIFE } from '../ZRSJZ_Constant';

/** 编辑器生成自己的角色几何数据；不读取、回传任何开放域玩家数据。 */
export function BakeRankingPortraits(data: sp.SkeletonData, frame = false): any {
    const runtime = data.getRuntimeData();
    const result: any = { skins: {} };
    const round = (a: ArrayLike<number>) => Array.from(a, n => Math.round(n * 1000) / 1000);
    const weaponSlots = ['dao', ...Array.from(ZRSJZ_WEAPONRY_TYPE.keys())];
    const mesh = (attachment: any, slot: any): any => {
        if (!attachment) return null;
        let vertices: number[], indices: number[];
        if (attachment instanceof sp.spine.RegionAttachment) {
            vertices = new Array(8).fill(0);
            attachment.computeWorldVertices(slot.bone, vertices, 0, 2);
            indices = [0, 1, 2, 2, 3, 0];
        } else if (attachment instanceof sp.spine.MeshAttachment) {
            vertices = new Array(attachment.worldVerticesLength).fill(0);
            attachment.computeWorldVertices(slot, 0, vertices.length, vertices, 0, 2);
            indices = Array.from(attachment.triangles);
        } else return null;
        return { xy: round(vertices), uv: Array.from(attachment.uvs as ArrayLike<number>, n => Math.round(n * 1000000) / 1000000), ix: indices,
            alpha: Math.round(slot.color.a * (attachment.color?.a ?? 1) * 1000) / 1000 };
    };
    const skins = frame ? new Map([['frame', { Skin: 'default' }]]) : ZRSJZ_SKIN_CONFIG;
    skins.forEach((config, name) => {
        const skeleton = new sp.spine.Skeleton(runtime);
        skeleton.setSkin(runtime.findSkin(config.Skin)); skeleton.setToSetupPose();
        const stateData = new sp.spine.AnimationStateData(runtime);
        const state = new sp.spine.AnimationState(stateData);
        state.setAnimation(0, frame ? runtime.animations[0].name : 'daiji_q', true); state.update(0.2); state.apply(skeleton); skeleton.updateWorldTransform();
        const draw: any[] = [];
        for (const slot of skeleton.drawOrder) {
            const slotName = slot.data.name;
            if (!frame && weaponSlots.includes(slotName)) {
                const b = slot.bone;
                const weapon: any = { slot: slotName, bone: [b.a, b.c, b.b, b.d, b.worldX, b.worldY] };
                const attachment: any = slotName === 'dao' ? null : skeleton.getAttachmentByName(slotName, slotName);
                if (attachment) weapon.offset = [attachment.x, attachment.y, attachment.rotation, attachment.scaleX, attachment.scaleY];
                if (slotName === 'dao') {
                    weapon.knives = {};
                    for (const knife of ZRSJZ_KNIFE) {
                        const item = mesh(skeleton.getAttachmentByName('dao', knife), slot);
                        if (item) weapon.knives[knife] = item;
                    }
                }
                draw.push(weapon); continue;
            }
            if (!frame && ['t', 'j', 'b'].includes(slotName)) continue;
            const item = mesh(slot.getAttachment(), slot); if (item) draw.push(item);
        }
        result.skins[name] = draw;
        (state as any).delete?.(); (stateData as any).delete?.(); (skeleton as any).delete?.();
    });
    return result;
}




/** 将本地 Spine 待机采样给封闭开放域使用，不回传任何平台玩家信息。 */
export function BakeRankingAnimation(data: sp.SkeletonData, skinName: string, mode: string): any {
    const runtime = data.getRuntimeData();
    const frame = mode === 'frame', knife = mode === 'knife';
    const animationName = frame ? (runtime.animations.find(a => a.name === 'animation') || runtime.animations[0]).name
        : knife ? 'daiji_dao1' : 'daiji_q';
    const animation = runtime.animations.find(a => a.name === animationName);
    if (!animation) throw new Error('缺少排行榜动画：' + animationName);
    const skeleton = new sp.spine.Skeleton(runtime);
    const stateData = new sp.spine.AnimationStateData(runtime);
    const state = new sp.spine.AnimationState(stateData);
    const fps = 24, count = Math.max(2, Math.ceil(animation.duration * fps));
    const clip: any = { duration: animation.duration, fps: count / animation.duration, frames: [] };
    const round = (a: ArrayLike<number>) => Array.from(a, n => Math.round(n * 1000) / 1000);
    const mesh = (attachment: any, slot: any): any => {
        if (!attachment) return null;
        let xy: number[], ix: number[];
        if (attachment instanceof sp.spine.RegionAttachment) {
            xy = new Array(8).fill(0); attachment.computeWorldVertices(slot.bone, xy, 0, 2); ix = [0, 1, 2, 2, 3, 0];
        } else if (attachment instanceof sp.spine.MeshAttachment) {
            xy = new Array(attachment.worldVerticesLength).fill(0);
            attachment.computeWorldVertices(slot, 0, xy.length, xy, 0, 2); ix = Array.from(attachment.triangles);
        } else return null;
        return { xy: round(xy), uv: Array.from(attachment.uvs as ArrayLike<number>, n => Math.round(n * 1000000) / 1000000), ix,
            alpha: Math.round(slot.color.a * (attachment.color?.a ?? 1) * 1000) / 1000, blend: slot.data.blendMode };
    };
    const gunSlots: string[] = [];
    ZRSJZ_WEAPONRY_TYPE.forEach((_names, slot) => gunSlots.push(slot));
    try {
        const skin = frame ? 'default' : ZRSJZ_SKIN_CONFIG.get(skinName)?.Skin;
        if (!skin) throw new Error('未知排行榜皮肤：' + skinName);
        skeleton.setSkin(runtime.findSkin(skin)); skeleton.setToSetupPose();
        state.setAnimation(0, animationName, true);
        if (knife) state.setAnimation(1, animationName, true);
        for (let index = 0; index < count; index++) {
            if (index) state.update(animation.duration / count);
            state.apply(skeleton);
            // 与 MainSkeleton / PlayerSkeleton 中的枪、刀手部显示规则一致。
            if (!frame) for (const slot of skeleton.slots) {
                const name = slot.data.name, gunHand = name.includes('左手3拿枪手1'), knifeHand = name.includes('左手3拿枪手2');
                if (!gunHand && !knifeHand) continue;
                if (knife ? knifeHand : gunHand) slot.setAttachment(null);
                else if (!slot.getAttachment()) {
                    const attachment = skeleton.getAttachmentByName(name, name);
                    if (attachment) slot.setAttachment(attachment);
                }
            }
            skeleton.updateWorldTransform();
            const parts: any[] = [];
            let clippingEnd = '';
            for (const slot of skeleton.drawOrder) {
                const name = slot.data.name;
                if (frame) {
                    const attachment = slot.getAttachment();
                    if (attachment instanceof sp.spine.ClippingAttachment && !clippingEnd) {
                        const clipXY = new Array(attachment.worldVerticesLength).fill(0);
                        attachment.computeWorldVertices(slot, 0, clipXY.length, clipXY, 0, 2);
                        parts.push({ clip: round(clipXY) });
                        clippingEnd = attachment.endSlot?.name || '__end__';
                    } else {
                        const part = mesh(attachment, slot); if (part) parts.push(part);
                    }
                    if (clippingEnd === name) { parts.push({ clipEnd: true }); clippingEnd = ''; }
                    continue;
                }
                if (!frame && name === 'dao') {
                    if (knife) {
                        const knives: any = {};
                        for (const weapon of ZRSJZ_KNIFE) { const part = mesh(skeleton.getAttachmentByName(name, weapon), slot); if (part) knives[weapon] = part; }
                        parts.push({ slot: 'dao', knives });
                    }
                    continue;
                }
                if (!frame && gunSlots.includes(name)) {
                    if (!knife) {
                        const attachment: any = skeleton.getAttachmentByName(name, name), b = slot.bone;
                        if (attachment) parts.push({ slot: name, bone: [b.a, b.c, b.b, b.d, b.worldX, b.worldY],
                            offset: [attachment.x, attachment.y, attachment.rotation, attachment.scaleX, attachment.scaleY] });
                    }
                    continue;
                }
                if (!frame && ['t', 'j', 'b'].includes(name)) continue;
                const part = mesh(slot.getAttachment(), slot); if (part) parts.push(part);
            }
            if (clippingEnd) parts.push({ clipEnd: true });
            clip.frames.push(parts);
        }
        return clip;
    } finally {
        (state as any).delete?.(); (stateData as any).delete?.(); (skeleton as any).delete?.();
    }
}
