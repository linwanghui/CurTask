import { director, SpriteFrame } from 'cc';
import { ZRSJZ_ACTION_CONFIG, ZRSJZ_ACTION_MAX_EQUIPPED } from '../ZRSJZ_Constant';
import { ZRSJZ_PlayerMain } from '../Controller/ZRSJZ_PlayerMain';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';

/** 装备数组的顺序对应圆盘上、右、下、左；卸下后后续动作向前补位。 */
export class ZRSJZ_ActionService {
    private static icons = new Map<string, Promise<SpriteFrame>>();
    public static RefreshUnlocks(): void {
        const data = ZRSJZ_GameData.Instance;
        let changed = false;
        for (const config of ZRSJZ_ACTION_CONFIG) {
            const unlock = config.Unlock;
            if ((unlock.Type === 'default' || (unlock.Type === 'level' && data.Grade >= unlock.Level))
                && !data.UnlockedActions.includes(config.Name)) {
                data.UnlockedActions.push(config.Name); changed = true;
            }
        }
        if (changed) ZRSJZ_GameData.SaveData();
    }
    public static Equip(name: string): string {
        this.RefreshUnlocks();
        const data = ZRSJZ_GameData.Instance;
        if (!ZRSJZ_ACTION_CONFIG.some(item => item.Name === name)) return '动作不存在';
        if (!data.UnlockedActions.includes(name)) return '动作尚未解锁';
        if (data.EquippedActions.includes(name)) return '';
        if (data.EquippedActions.length >= ZRSJZ_ACTION_MAX_EQUIPPED) return '动作已满';
        data.EquippedActions.push(name);
        ZRSJZ_GameData.SaveData();
        return '';
    }
    public static Unequip(name: string): void {
        const data = ZRSJZ_GameData.Instance;
        data.EquippedActions = data.EquippedActions.filter(action => action !== name);
        ZRSJZ_GameData.SaveData();
    }
    public static Play(index: number, playerIndex = 0): void {
        const data = ZRSJZ_GameData.Instance;
        const name = data.EquippedActions[index];
        const config = ZRSJZ_ACTION_CONFIG.find(item => item.Name === name);
        if (!config || !data.UnlockedActions.includes(name)) return;
        const scene = director.getScene();
        if (scene?.name === 'ZRSJZ_Start') {
            const players = scene.getComponentsInChildren(ZRSJZ_PlayerMain).filter(player => player.enabledInHierarchy);
            // 先结束上一轮所有参与者，重复选择同一动作时音效也从头开始。
            for (const player of players) player.PlayerSkeleton.StopAction();
            for (const player of players) player.BeginAction(config.Animation);
        } else if (scene?.name === 'ZRSJZ_Game') {
            ZRSJZ_Game.Instance?.GetPlayer(playerIndex)?.BeginAction(config.Animation);
        }
    }
    public static GetDirection(x: number, y: number): number {
        if (x * x + y * y < 24 * 24) return -1;
        return Math.abs(y) >= Math.abs(x) ? (y >= 0 ? 0 : 2) : (x >= 0 ? 1 : 3);
    }
    public static LoadIcon(name: string): Promise<SpriteFrame> {
        if (!this.icons.has(name)) {
            const request = ZRSJZ_Tools.LoadSpriteByBundle('73_ZRSJZ_DLC', 'Sprites/动作系统/动作/' + name)
                .catch(error => { this.icons.delete(name); throw error; });
            this.icons.set(name, request);
        }
        return this.icons.get(name);
    }
}
