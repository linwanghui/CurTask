import { ZRSJZ_FriendlyDamageService } from '../Service/ZRSJZ_FriendlyDamageService';
import { _decorator, Component, director, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
import { ZRSJZ_Bomb } from './ZRSJZ_Bomb';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_AchievementService } from '../Service/ZRSJZ_AchievementService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Bombing')
export class ZRSJZ_Bombing extends ZRSJZ_Bomb {

    Init(): void {
        super.Init();
        this.SkillRange = 400;
    }
    Attack() {
        const game = ZRSJZ_Game.Instance;
        const center = this.node.worldPosition;
        // 玩家处在轰炸区域附近且避开这次爆点，计作一次规避。
        if (game && !game.GamePaused && !game.IsGameFinished && game.Players.some(player =>
            player?.node?.isValid && !player.IsDead
            && Vec3.distance(center, player.node.worldPosition) > this.SkillRange
            && Vec3.distance(center, player.node.worldPosition) <= 3000)) {
            ZRSJZ_AchievementService.BombAvoided();
        }
        ZRSJZ_FriendlyDamageService.DamageArea(this.node.worldPosition, this.SkillRange, this.SkillDamage);
    }
}
