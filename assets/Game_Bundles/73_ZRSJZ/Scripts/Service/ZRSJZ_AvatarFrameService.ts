import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AVATAR_FRAME_UNLOCK } from '../ZRSJZ_Constant';
import { ZRSJZ_PetService } from './ZRSJZ_PetService';
import { ZRSJZ_AchievementService } from './ZRSJZ_AchievementService';

export class ZRSJZ_AvatarFrameService {
    public static SyncUnlocks(save = true): void {
        const data = ZRSJZ_GameData.Instance;
        const owned = new Set(data.OwnedAvatarFrames ?? []);
        const percent = ZRSJZ_AchievementService.GetCompletionPercent();
        let changed = false;
        for (const [id, rule] of Object.entries(ZRSJZ_AVATAR_FRAME_UNLOCK)) {
            const unlocked = id === '1'
                || (rule.difficulty !== undefined && data.AvatarFrameBossDifficulties?.includes(rule.difficulty))
                || (rule.kills !== undefined && (data.AvatarFrameNormalKills ?? 0) >= rule.kills)
                || (rule.percent !== undefined && percent >= rule.percent)
                || (!!rule.pet && !!rule.skin && ZRSJZ_PetService.CheckPetSkin(rule.pet, rule.skin));
            if (unlocked && !owned.has(id)) { owned.add(id); changed = true; }
        }
        if (changed) data.OwnedAvatarFrames = Array.from(owned);
        if (!owned.has(data.CurrentAvatarFrame) || !ZRSJZ_AVATAR_FRAME_UNLOCK[data.CurrentAvatarFrame]) {
            data.CurrentAvatarFrame = '1'; changed = true;
        }
        if (changed && save) ZRSJZ_GameData.SaveData();
    }
    public static IsOwned(id: string): boolean {
        return !!ZRSJZ_AVATAR_FRAME_UNLOCK[id] && !!ZRSJZ_GameData.Instance.OwnedAvatarFrames?.includes(id);
    }
    /** 绑定发起视频时的头像框；取消无奖励，重复成功回调仅处理一次。 */
    public static CreateVideoReward(id: string): (() => boolean) | null {
        if (!ZRSJZ_AVATAR_FRAME_UNLOCK[id]?.video || this.IsOwned(id)) return null;
        let consumed = false;
        return () => {
            if (consumed) return false;
            consumed = true;
            if (this.IsOwned(id)) return false;
            const data = ZRSJZ_GameData.Instance;
            data.OwnedAvatarFrames ??= ['1'];
            data.OwnedAvatarFrames.push(id);
            ZRSJZ_GameData.SaveData();
            return true;
        };
    }
}
