import { ZRSJZ_GameData } from '../ZRSJZ_GameData';

/** 按地图和行动逐级解锁；仅保存同局击败 Boss 后成功撤离的记录。 */
export class ZRSJZ_LevelProgressService {
    private static readonly Levels: readonly string[] = [
        '五号小镇_机密行动',
        '五号小镇_绝密行动',
        '沙漠古迹_机密行动',
        '沙漠古迹_绝密行动',
        '极北之地_机密行动',
        '极北之地_绝密行动',
    ];

    public static GetLockReason(mapKey: string): string {
        const index = this.Levels.indexOf(mapKey);
        if (index < 0) return '该关卡暂未开放';
        if (index === 0) return '';
        const previous = this.Levels[index - 1];
        return ZRSJZ_GameData.Instance.BossExtractionCompleted?.[previous] === true
            ? ''
            : `请先击败“${previous.replace('_', '-')}”的Boss并成功撤离`;
    }

    public static RecordCompletion(mapKey: string): void {
        if (!this.Levels.includes(mapKey)) return;
        const data = ZRSJZ_GameData.Instance;
        data.BossExtractionCompleted ??= {};
        if (data.BossExtractionCompleted[mapKey]) return;
        data.BossExtractionCompleted[mapKey] = true;
        ZRSJZ_GameData.SaveData();
    }
}
