import { _decorator, Node, Button, Label, Sprite, UITransform, Mask, Material, EffectAsset, SpriteFrame, assetManager, UIOpacity, Tween, tween, v3, sp, isValid } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_GUN_CAST_CONFIG as C, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GunCastService as S, ZRSJZ_GunCastItemKind } from '../Service/ZRSJZ_GunCastService';
import { ZRSJZ_GuidanceService } from '../Service/ZRSJZ_GuidanceService';
import { ZRSJZ_UIManager as UI } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass } = _decorator;
@ccclass('ZRSJZ_GunCastPanel')
export class ZRSJZ_GunCastPanel extends ZRSJZ_Panel {
    private busy = false; private settled = false; private initialized = false; private anim: sp.Skeleton = null; private timer = 0;
    private endingRequested = false;
    private hammerPlaying = false;
    private hammerEntry: any = null;
    private strikeSequence = 0;
    private completingStrike = false;
    // 与项目 Spine 铸枪/skeleton.json 中 qiaoji 事件时间一致。
    private strikeImpactTime = 0.3333;
    private breakingWeapon = false;
    private impactOrigin: { scale: any, position: any } = null;
    private flashMaterial: Material = null;
    private impactNodes = new Set<Node>();
    private resultFrames = new Map<number, SpriteFrame>();
    private resultVersion = 0;
    private itemPopupKind: ZRSJZ_GunCastItemKind = null;
    private itemAdRequest: object = null;
    private itemUseEffectVersion = 0;
    get CanClose() { return !this.busy && !this.hammerPlaying && !this.breakingWeapon; }
    private at(path: string, root: Node = this.Panel): Node { return path.split('/').reduce((n, k) => n?.getChildByName(k), root); }
    private text(path: string, value: string) { const n = this.at(path); const l = n?.getComponent(Label) ?? n?.getComponentInChildren(Label); if (l) l.string = value; }
    private active(path: string, value: boolean) { const n = this.at(path); if (n) n.active = value; }
    private bind(path: string, fn: () => void, feedback: boolean = true, scaleFeedback: boolean = feedback): void {
        const n = this.at(path);
        if (!n) return;
        const button = n.getComponent(Button) ?? n.addComponent(Button);
        button.clickEvents = [];
        button.transition = scaleFeedback ? Button.Transition.SCALE : Button.Transition.NONE;
        button.zoomScale = scaleFeedback ? 1.2 : 1;
        n.on(Button.EventType.CLICK, () => {
            if (!this.CanClose) return;
            if (feedback) ZRSJZ_AudioManager.Instance.PlaySound('点击');
            fn();
        }, this);
    }
    Show(...args: any[]) {
        this.Panel = this.node.getChildByName('Panel');
        if (!this.initialized) { this.initialized = true; this.init(); }
        this.endingRequested = false;
        this.itemPopupKind = null;
        const itemPopup = this.Panel?.getChildByName('道具弹窗');
        if (itemPopup) itemPopup.active = false;
        // 两个界面独立记录首次引导；入口关闭或退出后，尚未播放的下一段仍然有效。
        super.Show(() => {
            if (typeof args[0] === 'function') args[0]();
            if (this.node.name === '铸枪入口弹窗' || this.node.name === '铸枪界面') {
                ZRSJZ_GuidanceService.ShowFirstEntry(this.node, this.node.name, true);
            }
        });
        if (this.anim && !this.busy) this.restoreHammerIdle();
        this.refresh(); this.breathe();
    }
    private close() { UI.Instance.HidePanel('73_ZRSJZ_DLC/Prefabs/Panel/' + this.node.name); }
    private open(name: string) { UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/' + name); }
    private init() {
        // 引导区域只提供遮罩范围和提示配置，实际提示由界面引导弹窗显示。
        this.active('指导区域', false);
        if (this.node.name === '铸枪入口弹窗') {
            this.bindCatalogWeapons(true);
            this.bindOutsideClose();
            this.bind('关闭', () => this.close()); for (const free of [true, false]) this.bind(free ? '免费入场' : '付费入场', () => { const error = S.enter(free); if (error) { UI.Instance.ShowTip(error); return; } this.close(); this.open('铸枪界面'); });
        } else if (this.node.name === '枪械图鉴弹窗') {
            this.bindCatalogWeapons();
            const close = new Node('关闭'); close.parent = this.Panel; close.setPosition(540, 260); const l = close.addComponent(Label); l.string = '关闭'; this.bind('关闭', () => this.close());
            this.bindOutsideClose();
        } else {
            void this.prepareImpactEffects(); this.bind('中心', () => this.strike(), false);
            // 外层“返回”是定位容器，实际可点击按钮在同名子节点中；退出仅隐藏界面，保留本炉存档。
            this.bind('返回/返回', () => this.close()); this.bind('结束铸造', () => this.showEnding()); this.bind('图鉴', () => this.open('枪械图鉴弹窗'));
            this.bind('结束弹板/Panel/关闭', () => this.cancelEnding());
            this.bind('结束弹板/Panel/失败/取消', () => this.cancelEnding());
            this.bind('结束弹板/Panel/失败/带出', () => { void this.finish(); });
            this.bind('结束弹板/Panel/成功/带出', () => { void this.finish(); });
            this.bind('损毁弹板/Panel/关闭', () => this.close());
            for (const kind of S.itemKinds) {
                this.image('铸枪道具/' + kind + '/Icon', kind);
                this.bind('铸枪道具/' + kind, () => this.openItemPopup(kind));
            }
            this.bind('道具弹窗/Mask', () => this.closeItemPopup());
            this.bind('道具弹窗/Panel/关闭', () => this.closeItemPopup());
            this.bind('道具弹窗/Panel/操作', () => {
                if (this.itemPopupKind) this.useOrGetItem(this.itemPopupKind);
            });
            for (const name of ['放弃本炉', '结束本炉']) this.bind('损毁弹板/Panel/' + name, () => this.finish());
            this.bind('损毁弹板/Panel/观看视频', () => { const round = S.load().round; if (!round?.broken || round.recovered) return; const token = round; this.busy = true; let called = false; Banner.Instance.ShowVideoAd(() => { if (called) return; called = true; const r = S.load().round; if (r && r.id === token.id && r.level === token.level && r.ads === token.ads) { S.recover(); } this.busy = false; if (isValid(this.node)) this.refresh(); }); this.scheduleOnce(() => { this.busy = false; }, 2); });
            this.anim = this.at('锤子')?.getComponent(sp.Skeleton);
        }
    }
    private bindOutsideClose(): void {
        // Panel 和 Mask 自带 BlockInputEvents，内容点击不会触发外侧遮罩，也不会穿透。
        this.node.getChildByName('Mask')?.on(Node.EventType.TOUCH_END, () => {
            if (this.CanClose) this.close();
        }, this);
    }
    private bindCatalogWeapons(entrance: boolean = false): void {
        const preview = (weapon: string): void => {
            UI.Instance.ShowPanel(ZRSJZ_PANEL.道具弹窗, weapon, 0, true);
        };
        if (!entrance) for (let i = 0; i < C.weapons.length; i++) {
            this.bind('Layout/Lv' + (i + 1), () => preview(C.weapons[i]), true, false);
        }
        for (const [element, branch] of [['冰', 0], ['毒', 2], ['火', 1]] as const) {
            this.bind((entrance ? 'Layout' : 'LV13') + '/特殊武器底-' + element, () => preview(C.branches[branch].item), true, false);
        }
    }
    private readonly imageRequests = new WeakMap<Sprite, object>();
    private image(path: string, item: string): void {
        const sprite = this.at(path)?.getComponent(Sprite);
        if (!sprite || !item) return;
        const request = {};
        this.imageRequests.set(sprite, request);
        // 道具图使用 Sprites/Prop/装备/枪，由 UIManager 统一缓存和加载。
        void this.setPropImage(sprite, item, request);
    }
    private async setPropImage(sprite: Sprite, item: string, request: object): Promise<void> {
        const frame = await UI.Instance.GetPropUI(item);
        if (!isValid(sprite) || this.imageRequests.get(sprite) !== request) return;
        sprite.spriteFrame = frame ?? null;
    }
    private refresh() {
        const d = S.load(), r = d.round;
        if (this.node.name === '铸枪入口弹窗') { ['冰', '毒', '火'].forEach((element, i) => this.image('Layout/特殊武器底-' + element + '/Icon', C.branches[[0, 2, 1][i]].item)); const free = S.free(); this.active('免费入场', free); this.active('付费入场', !free); this.text('今日免费次数', free ? '1/1' : '0/1'); return; }
        if (this.node.name === '枪械图鉴弹窗') {
            for (let i = 0; i < 12; i++) { const p = 'Layout/Lv' + (i + 1); this.image(p + '/Icon', C.weapons[i]); this.active(p + '/Cur', r?.level === i); this.active(p + '/lock', !r || i > r.level); this.text(p + '/tip', 'LV.' + (i + 1)); }
            ['冰', '毒', '火'].forEach((s, i) => { const b = [0, 2, 1][i], p = 'LV13/特殊武器底-' + s; this.image(p + '/Icon', C.branches[b].item); this.active(p + '/lock', !r || r.level < 12 || r.branch !== b); this.text(p + '/tip-001', C.branches[b].name); }); return;
        }
        if (!r) return;
        this.refreshItemCards();
        const strikeButton = this.at('中心')?.getComponent(Button); if (strikeButton) strikeButton.interactable = !this.busy && !this.hammerPlaying && !this.breakingWeapon && !r.broken && !this.endingRequested && !this.itemPopupKind && r.level < 12;
        const weaponSprite = this.at('当前武器Icon')?.getComponent(Sprite); if (weaponSprite) weaponSprite.enabled = !r.broken;
        const name = r.level === 12 ? C.branches[r.branch].name : C.weapons[r.level]; this.text('当前武器名称', name + ' +' + r.level); this.text('当前武器价值', C.values[r.level] + '万'); this.text('当前武器/Tip', '第' + (r.level + 1) + '级');
        this.image('当前武器/Icon', S.item(r)); this.image('当前武器Icon', S.item(r)); this.image('下一把武器/Icon', C.weapons[Math.min(11, r.level + 1)]); this.active('下一把武器/13级', r.level >= 11); this.active('下一把武器/Icon', r.level < 11);
        this.refreshSuperTimer(r); const sup = r.superUntil > Date.now(); this.active('超级时刻Icon', sup); this.active('超级时刻Spine', sup); const spine = this.at('超级时刻Spine')?.getComponent(sp.Skeleton); if (sup && spine && !spine.animation) { const a = spine.skeletonData?.getAnimsEnum(); if (a) { const key = Object.keys(a).find(k => isNaN(Number(k))); if (key) spine.setAnimation(0, key, true); } }
        for (let i = 1; i <= 10; i++)this.active('铸造次数/Item' + i + '/Checked', i <= r.hits); this.text('铸造次数/当前次数', sup ? '超级时刻' : r.hits + '/10');
        this.refreshProbabilityBar(r.level);
        const brokenPanel = this.at('损毁弹板'); const wasBroken = brokenPanel?.active; this.active('损毁弹板', r.broken && !this.breakingWeapon); if (r.broken && !this.breakingWeapon && !wasBroken) { const body = this.at('损毁弹板/Panel'); if (body) { Tween.stopAllByTarget(body); body.setScale(.7, .7, 1); tween(body).to(.25, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start(); } } this.active('结束弹板', this.endingRequested); if (r.level >= 12 && !this.busy && !r.broken) this.showEnding(); this.text('损毁弹板/Panel/Name', name + ' +' + r.level); this.text('损毁弹板/Panel/估值', C.values[r.level] + '万');
        // 预制体有两个同名 tip：保留标题，只切换“观看视频恢复”提示。
        const damageBody = this.at('损毁弹板/Panel');
        damageBody?.children.filter(child => child.name === 'tip').slice(1)
            .forEach(child => { child.active = !r.recovered; });
        for (const k of ['观看视频', '放弃本炉', '加载条底', '加载条', 'tip-003', 'tip-004']) this.active('损毁弹板/Panel/' + k, !r.recovered);
        const recoveryAds = S.recoveryAds(r);
        this.active('损毁弹板/Panel/结束本炉', r.recovered); this.active('损毁弹板/Panel/tip-005', r.recovered); this.text('损毁弹板/Panel/tip-003', r.ads + '/' + recoveryAds); this.text('损毁弹板/Panel/结束本炉/tip-003', '结束本炉'); const bar = this.at('损毁弹板/Panel/加载条')?.getComponent(Sprite); if (bar) bar.fillRange = Math.min(1, r.ads / recoveryAds);
    }
    private probabilityTweenState: { progress: number } = null;

    private refreshItemCards(): void {
        for (const kind of S.itemKinds) {
            const path = '铸枪道具/' + kind;
            const count = S.itemCount(kind), active = S.itemEffect(kind);
            this.text(path + '/数量', 'x' + count);
            this.active(path + '/使用中', active);
            const button = this.at(path)?.getComponent(Button);
            if (button) button.interactable = this.CanClose && !this.endingRequested;
        }
        this.refreshItemPopup();
    }

    private openItemPopup(kind: ZRSJZ_GunCastItemKind): void {
        if (!this.CanClose || this.endingRequested || !S.isCastItem(kind)) return;
        this.itemPopupKind = kind;
        this.active('道具弹窗', true);
        this.image('道具弹窗/Panel/Icon', kind);
        void this.setItemQuality(kind);
        this.refresh();
    }

    private async setItemQuality(kind: ZRSJZ_GunCastItemKind): Promise<void> {
        const sprite = this.at('道具弹窗/Panel/品质')?.getComponent(Sprite);
        if (!sprite) return;
        try {
            const frame = await UI.Instance.GetPropGridUI(kind === '铸枪护盾' ? '金色格子1_1' : '红色格子1_1');
            if (isValid(sprite) && this.itemPopupKind === kind) sprite.spriteFrame = frame;
        } catch (error) { console.warn('[铸枪道具] 品质底图加载失败', error); }
    }

    private closeItemPopup(): void {
        if (!this.CanClose) return;
        this.itemPopupKind = null;
        this.active('道具弹窗', false);
        this.refresh();
    }

    private refreshItemPopup(): void {
        const kind = this.itemPopupKind;
        if (!kind) return;
        const path = '道具弹窗/Panel', r = S.load().round;
        const active = S.itemEffect(kind), count = S.itemCount(kind);
        this.text(path + '/名称', kind);
        this.text(path + '/说明', kind === '铸枪护盾'
            ? '抵挡一次武器损毁。\n不抵挡降级损伤。\n效果触发后自动取消；\n未触发前，退出仍保留。'
            : '下次有效敲击必定成功，\n武器提升一级。\n效果触发后自动取消；\n未触发前，退出仍保留。');
        this.text(path + '/数量', '拥有数量：' + count);
        this.text(path + '/状态', active ? '使用中 · 效果触发后自动取消' : '可通过搜索带出或观看视频获得');
        const needsVideo = !active && count <= 0;
        this.text(path + '/操作/文字', active ? '使用中' : count > 0 ? '使用道具' : '免费获取');
        this.active(path + '/操作/视频角标黑色', needsVideo);
        const actionLabel = this.at(path + '/操作/文字');
        if (actionLabel) actionLabel.setPosition(needsVideo ? -24 : 0, 0, 0);
        const button = this.at(path + '/操作')?.getComponent(Button);
        if (button) button.interactable = this.CanClose && !!r && !r.broken && r.level < 12 && !this.endingRequested && !active;
    }

    private useOrGetItem(kind: ZRSJZ_GunCastItemKind): void {
        const r = S.load().round;
        if (!this.CanClose || !r || r.broken || r.level >= 12 || this.endingRequested) return;
        if (S.itemCount(kind) > 0 || S.itemEffect(kind)) {
            const error = S.useItem(kind);
            UI.Instance.ShowTip(error || (kind === '铸枪护盾' ? '护盾已开启，将抵挡一次武器损毁' : '必成效果已开启，下次敲击必定成功'));
            if (!error) {
                this.closeItemPopup();
            }
            else this.refreshItemCards();
            return;
        }
        const reward = S.createItemVideoReward(kind);
        const request = this.itemAdRequest = {};
        const release = () => {
            if (this.itemAdRequest !== request) return;
            this.itemAdRequest = null;
            this.busy = false;
        };
        this.busy = true;
        this.refreshItemCards();
        Banner.Instance.ShowVideoAd(() => {
            const granted = reward();
            if (!isValid(this.node)) return;
            release();
            if (granted) UI.Instance.ShowTip(kind + ' +1');
            this.refreshItemCards();
        });
        // 广告接口仅提供成功回调，取消或加载失败时也需要恢复界面操作。
        this.scheduleOnce(() => {
            if (!isValid(this.node)) return;
            release();
            this.refreshItemCards();
        }, 2);
    }

    private async playItemUseEffect(kind: ZRSJZ_GunCastItemKind): Promise<void> {
        const version = this.itemUseEffectVersion;
        const source = this.at('铸枪道具/' + kind + '/Icon');
        const origin = source?.worldPosition.clone();
        try {
            const frame = source?.getComponent(Sprite)?.spriteFrame ?? await UI.Instance.GetPropUI(kind);
            if (!frame || version !== this.itemUseEffectVersion || !isValid(this.node) || !this.node.activeInHierarchy) return;
            const effect = new Node('道具生效-' + kind);
            effect.layer = this.Panel.layer; effect.parent = this.Panel;
            effect.addComponent(UITransform).setContentSize(100, 100);
            const sprite = effect.addComponent(Sprite); sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const start = origin ? this.Panel.getComponent(UITransform).convertToNodeSpaceAR(origin) : v3(0, 0, 0);
            effect.setPosition(start);
            // 特效位于业务弹板下方，打开其他弹板时不会浮在遮罩上。
            const modalIndex = this.Panel.children.findIndex(child => ['损毁弹板', '结束弹板', '道具弹窗'].includes(child.name));
            if (modalIndex >= 0) effect.setSiblingIndex(modalIndex);
            const opacity = effect.addComponent(UIOpacity); opacity.opacity = 255;
            this.impactNodes.add(effect);
            tween(effect).to(1.6, { position: v3(start.x, start.y + 180, start.z) }, { easing: 'sineOut' }).start();
            tween(opacity).delay(0.45).to(1.15, { opacity: 0 }).call(() => this.removeImpactNode(effect)).start();
        } catch (error) { console.warn('[铸枪道具] 生效特效加载失败', error); }
    }

    private refreshProbabilityBar(level: number): void {
        const root = this.at('铸枪概率');
        const rootTransform = root?.getComponent(UITransform);
        if (!rootTransform) return;
        if (this.probabilityTweenState) Tween.stopAllByTarget(this.probabilityTweenState);
        // 沿用预制体从左到右的顺序；配置顺序正好相反。
        const names = ['破坏', '损伤', '维持', '成功', '大成功'];
        const segments = names.map(name => this.at(name, root));
        if (segments.some(node => !node?.getComponent(UITransform))) return;
        const totalWidth = Math.max(400, rootTransform.width - 8);
        const probabilities = level >= 12 ? [0, 0, 0, 0, 0]
            : C.probabilities[Math.max(0, level)].slice().reverse();
        const targetWidths = ZRSJZ_GetGunCastWidths(probabilities, totalWidth);
        const transforms = segments.map(node => node.getComponent(UITransform));
        const startWidths = transforms.map(transform => Math.max(80, transform.width));
        const normalizedStart = ZRSJZ_GetGunCastWidths(startWidths, totalWidth);
        const labels = segments.map(node => node.getChildByName('概率')?.getComponent(Label));
        const startProbabilities = labels.map(label => parseFloat(label?.string) || 0);
        segments.forEach(node => {
            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.type = Sprite.Type.SIMPLE;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            }
        });
        const state = this.probabilityTweenState = { progress: 0 };
        const apply = () => {
            if (!isValid(root)) return;
            let left = -rootTransform.anchorX * rootTransform.width + (rootTransform.width - totalWidth) / 2;
            segments.forEach((node, i) => {
                const transform = transforms[i];
                const width = normalizedStart[i] + (targetWidths[i] - normalizedStart[i]) * state.progress;
                transform.setContentSize(width, transform.height);
                node.setPosition(left + transform.anchorX * width, node.position.y, node.position.z);
                left += width;
                if (labels[i]) labels[i].string = Math.round(startProbabilities[i]
                    + (probabilities[i] - startProbabilities[i]) * state.progress) + '%';
                // 标题、概率保持在所属色块中央，最窄色块的文字也不会跨到相邻块。
                for (const childName of ['Name', '概率']) {
                    const child = node.getChildByName(childName);
                    const label = child?.getComponent(Label);
                    const childTransform = child?.getComponent(UITransform);
                    if (label && childTransform) {
                        child.setPosition((0.5 - transform.anchorX) * width, child.position.y, child.position.z);
                        childTransform.setContentSize(Math.max(1, width - 8), childTransform.height);
                        label.overflow = Label.Overflow.SHRINK;
                    }
                }
            });
        };
        apply();
        tween(state).to(0.35, { progress: 1 }, { easing: 'sineInOut', onUpdate: apply })
            .call(() => { if (this.probabilityTweenState === state) this.probabilityTweenState = null; }).start();
    }

    private breathe() { const o = this.at('中心')?.getComponent(UIOpacity); if (!o || this.busy) return; Tween.stopAllByTarget(o); tween(o).to(.8, { opacity: 100 }).to(.8, { opacity: 210 }).union().repeatForever().start(); }
    private strike(): void {
        // 方法本身也防重入，不能只依赖按钮事件层的 busy 检查。
        if (this.busy || this.hammerPlaying || this.breakingWeapon || this.hammerEntry) return;
        const r = S.load().round;
        if (!r || r.broken || this.endingRequested) return;
        if (this.itemPopupKind) return;
        if (r.level >= 12) { UI.Instance.ShowTip('已达最高等级，请结束铸造'); return; }
        if (!this.anim?.findAnimation('qiaoji')) { UI.Instance.ShowTip('敲打动画尚未就绪'); return; }
        this.busy = true; this.hammerPlaying = true; this.settled = false;
        const button = this.at('中心')?.getComponent(Button);
        if (button) button.interactable = false;
        try {
            const sequence = ++this.strikeSequence;
            this.completingStrike = false;
            const entry = this.anim.setAnimation(0, 'qiaoji', false);
            this.hammerEntry = entry;
            this.anim.setTrackEventListener(entry, (_entry, event: any) => {
                if (sequence !== this.strikeSequence || !this.hammerPlaying || this.completingStrike) return;
                if (event.data.name === 'qiaoji' || event.data.name === 'qiaoda') this.qiaoda();
            });
            this.anim.setTrackCompleteListener(entry, () => this.completeStrike(sequence));
        } catch (error) {
            this.hammerPlaying = false; this.busy = false; this.hammerEntry = null;
            if (button) button.interactable = true;
            throw error;
        }
    }
    private completeStrike(sequence: number): void {
        if (!this.hammerPlaying || sequence !== this.strikeSequence || this.completingStrike) return;
        // 个别运行环境会丢失帧事件；完整播完时必须补结算，然后才能解锁。
        if (!this.settled) this.qiaoda();
        this.completingStrike = true;
        // 完成回调正在 Spine 事件派发中；下一帧再切轨道，避免回调期间清理 TrackEntry。
        this.scheduleOnce(() => {
            if (!isValid(this.node) || sequence !== this.strikeSequence) return;
            this.hammerEntry = null;
            this.hammerPlaying = false;
            this.completingStrike = false;
            this.busy = this.breakingWeapon;
            this.restoreHammerIdle();
            this.refresh(); this.breathe();
        }, 0);
    }
    private checkStrikeCompletion(): void {
        if (!this.hammerPlaying || this.completingStrike || !this.anim) return;
        const entry = this.anim.getCurrent(0);
        if (!entry || entry.animation?.name !== 'qiaoji') return;
        // 由轨道实际进度补敲击事件：掉帧跨过敲击点也只结算一次。
        if (!this.settled && entry.trackTime >= this.strikeImpactTime) this.qiaoda();
        const duration = entry.animationEnd || entry.animation?.duration || 0;
        // 只在动画真实播放到末帧时补处理完成，不用固定延时提前解锁。
        if (duration > 0 && entry.trackTime >= duration) this.completeStrike(this.strikeSequence);
    }
    private restoreHammerIdle(): void {
        if (!this.anim) return;
        // qiaoji 最后一帧将 hammer 槽设为透明，daiji 没有槽颜色轨道。
        // 先移除旧轨道再恢复初始姿态，避免旧动画混合时重新写入透明度。
        this.anim.clearTrack(0);
        this.anim.setToSetupPose();
        this.anim.setAnimation(0, 'daiji', true);
    }
    private async prepareImpactEffects(): Promise<void> {
        const icon = this.at('当前武器Icon');
        if (icon && !this.impactOrigin) this.impactOrigin = { scale: icon.scale.clone(), position: icon.position.clone() };
        const bundle = assetManager.getBundle('73_ZRSJZ');
        bundle?.load('Spine/铸枪闪白', EffectAsset, (error, effect) => {
            if (error || !isValid(this.node)) return;
            const material = new Material();
            material.initialize({ effectAsset: effect, defines: { USE_TEXTURE: true } });
            this.flashMaterial = material;
        });
        await Promise.all(['大成功', '成功', '维持', '损伤', '破坏'].map(async (name, i) => {
            try {
                const frame = await ZRSJZ_Tools.LoadSpriteByBundle('73_ZRSJZ_DLC', 'Sprites/铸枪界面/铸枪/敲打结算/' + name);
                if (isValid(this.node)) this.resultFrames.set(i, frame);
            } catch (error) { console.warn('[铸枪特效] 结果图片加载失败', name, error); }
        }));
    }
    // 使用 Spine 敲击事件驱动视觉与结算，同一次动画只处理一次。
    public qiaoda(): void {
        if (!this.hammerPlaying || this.settled) return;
        const icon = this.at('当前武器Icon');
        const sprite = icon?.getComponent(Sprite);
        const struckFrame = sprite?.spriteFrame;
        const pendingItems = S.itemKinds.filter(kind => S.itemEffect(kind));
        const result = S.hit();
        if (result < 0) return;
        this.settled = true;
        ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打');
        // 仅在本次敲击真正消耗了道具效果时播放，开启待用状态不播放。
        for (const kind of pendingItems) {
            if (!S.itemEffect(kind)) void this.playItemUseEffect(kind);
        }
        const broken = !!S.load().round?.broken;
        if (broken) {
            ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打失败');
        } else if (result === 0 || result === 1) {
            ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打成功');
        }
        this.breakingWeapon = broken;
        this.flashWeapon(struckFrame);
        const opacity = this.at('中心')?.getComponent(UIOpacity);
        if (opacity) {
            Tween.stopAllByTarget(opacity); opacity.opacity = 255;
            tween(opacity).delay(.1).to(.2, { opacity: 130 }).start();
        }
        this.refresh();
        void this.popHitResult(result);
        if (broken) this.shatterWeapon(struckFrame);
    }
    private flashWeapon(frame: SpriteFrame): void {
        const icon = this.at('当前武器Icon');
        if (!icon || !this.impactOrigin) return;
        Tween.stopAllByTarget(icon);
        icon.setScale(this.impactOrigin.scale);
        const base = this.impactOrigin.scale;
        tween(icon).to(.07, { scale: v3(base.x * 1.1, base.y * 1.1, base.z) }, { easing: 'quadOut' })
            .to(.18, { scale: base.clone() }, { easing: 'sineOut' }).start();
        if (!frame || !this.flashMaterial) return;
        const flash = new Node('敲击白光'); flash.layer = icon.layer; flash.parent = icon;
        const source = icon.getComponent(UITransform);
        const transform = flash.addComponent(UITransform);
        transform.setContentSize(source.contentSize); transform.setAnchorPoint(source.anchorPoint);
        const sprite = flash.addComponent(Sprite); sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.customMaterial = this.flashMaterial;
        const opacity = flash.addComponent(UIOpacity); opacity.opacity = 230;
        this.impactNodes.add(flash);
        tween(opacity).delay(.04).to(.18, { opacity: 0 }).call(() => this.removeImpactNode(flash)).start();
    }
    private async popHitResult(result: number): Promise<void> {
        const version = ++this.resultVersion;
        const node = this.at('敲打结果');
        const icon = this.at('当前武器Icon');
        if (!node || !icon) return;
        let frame = this.resultFrames.get(result);
        if (!frame) {
            try { frame = await ZRSJZ_Tools.LoadSpriteByBundle('73_ZRSJZ_DLC', 'Sprites/铸枪界面/铸枪/敲打结算/' + ['大成功', '成功', '维持', '损伤', '破坏'][result]); }
            catch { return; }
        }
        if (!isValid(node) || !this.node.activeInHierarchy || version !== this.resultVersion) return;
        const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        Tween.stopAllByTarget(node); Tween.stopAllByTarget(opacity);
        node.active = true; node.setSiblingIndex(this.Panel.children.length - 1);
        node.setPosition(icon.position); node.setScale(.25, .25, 1); node.angle = -8;
        opacity.opacity = 255;
        tween(node).to(.25, { position: v3(icon.position.x, icon.position.y + 455, icon.position.z), scale: v3(1, 1, 1), angle: 5 }, { easing: 'backOut' })
            .to(.15, { position: v3(icon.position.x, icon.position.y + 435, icon.position.z), angle: 0 }, { easing: 'sineInOut' })
            .delay(.35).by(.2, { position: v3(0, 35, 0) }).call(() => { node.active = false; }).start();
        tween(opacity).delay(.75).to(.2, { opacity: 0 }).start();
    }
    private shatterWeapon(frame: SpriteFrame): void {
        const icon = this.at('当前武器Icon');
        if (!icon || !frame || !this.impactOrigin) {
            this.breakingWeapon = false; this.refresh(); return;
        }
        const source = icon.getComponent(UITransform);
        const root = new Node('武器碎片'); root.layer = icon.layer; root.parent = this.Panel;
        root.setPosition(this.impactOrigin.position); root.setScale(this.impactOrigin.scale);
        root.setRotation(icon.rotation); this.impactNodes.add(root);
        const width = source.width, height = source.height;
        // 每块用矩形遮罩裁切同一张 SpriteFrame，兼容图集旋转和裁剪。
        for (let row = 0; row < 2; row++) for (let column = 0; column < 5; column++) {
            const piece = new Node('碎片'); piece.layer = icon.layer; piece.parent = root;
            const cellWidth = width / 5, cellHeight = height / 2;
            const x = -source.anchorX * width + (column + .5) * cellWidth;
            const y = -source.anchorY * height + (row + .5) * cellHeight;
            piece.addComponent(UITransform).setContentSize(cellWidth, cellHeight);
            piece.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
            piece.setPosition(x, y); piece.active = false;
            const image = new Node('枪图'); image.layer = icon.layer; image.parent = piece;
            const transform = image.addComponent(UITransform);
            transform.setContentSize(source.contentSize); transform.setAnchorPoint(source.anchorPoint);
            image.setPosition(-x, -y);
            const sprite = image.addComponent(Sprite); sprite.spriteFrame = frame; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const floor = -(this.Panel.getComponent(UITransform)?.height ?? 1080) / Math.max(.1, this.impactOrigin.scale.y) - Math.abs(root.position.y);
            const direction = column - 2;
            tween(piece).delay(.1).call(() => { piece.active = true; })
                .to(.16, { position: v3(x + direction * 12, y + 20 + row * 10, 0), angle: direction * 9 }, { easing: 'quadOut' })
                .to(.65, { position: v3(x + direction * 55, floor - row * 80, 0), angle: direction * 65 + (row ? 40 : -40) }, { easing: 'quadIn' }).start();
        }
        tween(root).delay(.93).call(() => {
            this.removeImpactNode(root);
            this.breakingWeapon = false;
            this.busy = this.hammerPlaying;
            this.refresh(); this.breathe();
        }).start();
    }
    private removeImpactNode(node: Node): void {
        this.impactNodes.delete(node);
        if (isValid(node)) node.destroy();
    }
    private clearImpactEffects(): void {
        this.resultVersion++;
        for (const node of this.impactNodes) {
            if (!isValid(node)) continue;
            for (const child of [node, ...node.children]) {
                Tween.stopAllByTarget(child);
                const opacity = child.getComponent(UIOpacity); if (opacity) Tween.stopAllByTarget(opacity);
            }
            node.destroy();
        }
        this.impactNodes.clear();
        const result = this.at('敲打结果');
        if (result) { Tween.stopAllByTarget(result); const opacity = result.getComponent(UIOpacity); if (opacity) Tween.stopAllByTarget(opacity); result.active = false; }
        const icon = this.at('当前武器Icon');
        if (icon && this.impactOrigin) { Tween.stopAllByTarget(icon); icon.setScale(this.impactOrigin.scale); icon.setPosition(this.impactOrigin.position); }
    }
    private showEnding(): void {
        const r = S.load().round;
        if (!r || r.broken || this.busy) return;
        const modal = this.at('结束弹板');
        const animate = !modal?.active;
        this.endingRequested = true;
        this.active('结束弹板', true);
        this.active('结束弹板/Panel/失败', r.level < 12);
        this.active('结束弹板/Panel/成功', r.level >= 12);
        this.image('结束弹板/Panel/Icon', S.item(r));
        const name = r.level === 12 ? C.branches[r.branch].name : C.weapons[r.level];
        this.text('结束弹板/Panel/Name', name + ' +' + r.level);
        const body = this.at('结束弹板/Panel');
        if (animate && body) {
            Tween.stopAllByTarget(body);
            body.setScale(.7, .7, 1);
            tween(body).to(.25, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        }
    }
    private cancelEnding(): void {
        if (this.busy) return;
        if (S.load().round?.level >= 12) { this.close(); return; }
        this.endingRequested = false;
        this.active('结束弹板', false);
        this.refresh(); this.breathe();
    }
    private refreshSuperTimer(r: any): void {
        const remaining = Math.max(0, (r.superUntil || 0) - Date.now());
        this.active('超级时刻Timer', remaining > 0);
        const hundredths = Math.ceil(remaining / 10);
        this.text('超级时刻Timer', Math.floor(hundredths / 100) + ':' + String(hundredths % 100).padStart(2, '0'));
    }
    private async finish(): Promise<void> {
        if (this.busy) return;
        const r = S.load().round;
        if (!r) { this.close(); return; }
        this.busy = true;
        try {
            const item = S.item(r);
            if (!r.broken) {
                const result = await UI.Instance.ReceivePropAwards([{ PropName: item, Count: 1 }]);
                if (result.InvalidAwards.length) throw new Error('武器配置无效');
                if (result.MailAwards.length) UI.Instance.ShowTip('仓库空间不足，武器已发送至邮件');
            }
            S.finish();
            this.endingRequested = false;
            this.busy = false;
            this.close();
            if (!r.broken) UI.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, {
                Awards: [{ TaskAwardName: item, TaskAwardCount: 1 }], DisplayOnly: true,
            });
        } catch (error) {
            this.busy = false;
            UI.Instance.ShowTip('领取失败，请重试');
        }
    }
    update(dt: number): void {
        if (this.node.name !== '铸枪界面') return;
        this.checkStrikeCompletion();
        const d = S.load(), r = d.round;
        if (!r) return;
        this.refreshSuperTimer(r);
        this.timer += dt;
        if (this.timer < .05) return;
        this.timer = 0;
        if (r.superUntil && Date.now() >= r.superUntil) {
            r.superUntil = 0; r.hits = 0; S.save(d); this.refresh();
        }
    }
    onDisable() { this.itemUseEffectVersion++; this.itemPopupKind = null; this.itemAdRequest = null; this.strikeSequence++; this.completingStrike = false; this.clearImpactEffects(); this.breakingWeapon = false; this.hammerPlaying = false; this.hammerEntry = null; this.busy = false; if (this.probabilityTweenState) { Tween.stopAllByTarget(this.probabilityTweenState); this.probabilityTweenState = null; } const o = this.at('中心')?.getComponent(UIOpacity); if (o) Tween.stopAllByTarget(o); }
    onDestroy(): void { this.clearImpactEffects(); this.flashMaterial?.destroy(); }
}

/** 最小宽度约束下按权重分配，所有段的总宽度始终等于容器宽度。 */
export function ZRSJZ_GetGunCastWidths(weights: number[], totalWidth: number, minimum: number = 80): number[] {
    if (!weights.length) return [];
    const total = Math.max(totalWidth, weights.length * minimum);
    const widths = weights.map(() => 0);
    let remaining = total;
    let pending = weights.map((_, i) => i);
    while (pending.length) {
        const sum = pending.reduce((value, i) => value + Math.max(0, weights[i]), 0);
        const small = pending.filter(i => (sum > 0 ? remaining * Math.max(0, weights[i]) / sum : remaining / pending.length) < minimum);
        if (!small.length) {
            pending.forEach(i => { widths[i] = sum > 0 ? remaining * Math.max(0, weights[i]) / sum : remaining / pending.length; });
            break;
        }
        small.forEach(i => { widths[i] = minimum; remaining -= minimum; });
        pending = pending.filter(i => !small.includes(i));
    }
    return widths;
}
