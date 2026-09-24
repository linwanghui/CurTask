import { Component, find, isValid, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';

/** 在界面展开并完成初始化后，播放首次解锁指引。 */
export class ZRSJZ_GuidanceService {
    public static ShowFirstEntry(owner: Node, feature: string, firstUnlock: boolean): void {
        if (!firstUnlock || !isValid(owner, true) || !owner.activeInHierarchy
            || !ZRSJZ_UIManager.Instance.IsCurrentPanel(owner)
            || ZRSJZ_GameData.Instance.StartedFeatureGuides?.[feature]) return;
        // 通过注册名读取 DLC 组件，避免主包直接依赖 DLC 脚本。
        const region = find('Panel/指导区域', owner);
        const steps = region?.getComponentsInChildren<Component & { readonly IsConfigured: boolean }>('ZRSJZ_Guidance')
            .filter(step => step.IsConfigured) ?? [];
        if (steps.length) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.界面引导弹窗,
                { steps, owner, feature });
        }
    }
}
