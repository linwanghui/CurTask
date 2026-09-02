import { CombinationGameData } from '../../../Scripts/CombinationGameData';
import { WZSJZ_Constant } from './WZSJZ_Constant';

/** 单次通关获得的真人三角洲联动奖励。 */
export interface WZSJZ_CombinationAwardData {
    Name: string;
    Amount: number;
    TotalNum: number;
    SpritePath: string;
}

/** 只负责联动奖池抽取和外部联动数据写入，不耦合关卡与UI。 */
export class WZSJZ_CombinationRewardSystem {
    public static GrantRandomClearReward(): WZSJZ_CombinationAwardData | null {
        if (!WZSJZ_Constant.ZRSJZcombination) return null;

        const config = WZSJZ_Constant.ZRSJZCombinationReward;
        if (config.PropNames.length <= 0) return null;

        const name = config.PropNames[
            Math.floor(Math.random() * config.PropNames.length)
        ];
        const amount = Math.max(1, Math.floor(config.AmountPerClear));
        // 统一通过CombinationGameData入口修改，成功后会立即写入本地存档。
        const prop = CombinationGameData.Instance.AddZRSJZProp(name, amount);
        if (!prop) return null;

        return {
            Name: name,
            Amount: amount,
            TotalNum: prop.Num,
            SpritePath: `${config.SpriteFolder}/${name}`,
        };
    }
}
