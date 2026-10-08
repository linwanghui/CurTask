import { _decorator, assetManager, Component, director, isValid, Prefab, Vec3 } from 'cc';
import { ZRSJZ_EnemyBase } from '../Controller/ZRSJZ_EnemyBase';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_BoosterShotService } from '../Service/ZRSJZ_BoosterShotService';
import { ZRSJZ_EnhancementService } from '../Service/ZRSJZ_EnhancementService';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UluMissile } from './ZRSJZ_UluMissile';

const { ccclass, property } = _decorator;

/** 战斗结算入口；角色界面只调用 UluMissile.Show，不启用伤害和声画反馈。 */
@ccclass('ZRSJZ_UluSkill')
export class ZRSJZ_UluSkill extends Component {
    @property({ displayName: '爆炸半径（世界单位）', min: 0 })
    ExplosionRadius = 300;

    @property({ displayName: '基础爆炸伤害', min: 0, tooltip: '实际伤害叠加攻击针及技能强化加成' })
    ExplosionDamage = 50;

    @property({ displayName: '爆炸最大抖动强度', min: 0 })
    ShakeStrength = 35;

    @property({ displayName: '爆炸抖动时长（秒）', min: 0 })
    ShakeDuration = 0.3;

    @property({ displayName: '声效与抖动传播半径', min: 1, tooltip: '按各玩家与爆点的距离衰减，超出范围无反馈' })
    FeedbackRadius = 3000;

    @property({ displayName: '爆炸音效名称' })
    ExplosionSound = '轰炸';

    @property({ displayName: '战斗导弹速度倍率', min: 0.01 })
    MovementSpeedMultiplier = 2;

    private _game: ZRSJZ_Game = null;
    private _damage = 0;
    private _exploded = false;

    public static LoadPrefab(): Promise<Prefab> {
        return new Promise((resolve, reject) => {
            const load = (bundle: ReturnType<typeof assetManager.getBundle>): void => {
                bundle.load('Prefabs/Effect/技能_乌鲁', Prefab, (error, prefab) => {
                    if (error || !prefab) reject(error ?? new Error('技能_乌鲁预制体为空'));
                    else resolve(prefab);
                });
            };
            const bundle = assetManager.getBundle('73_ZRSJZ_DLC');
            if (bundle) load(bundle);
            else assetManager.loadBundle('73_ZRSJZ_DLC', (error, loaded) => {
                if (error || !loaded) reject(error ?? new Error('73_ZRSJZ_DLC 加载失败'));
                else load(loaded);
            });
        });
    }

    public Launch(start: Vec3, direction: Vec3, target: Vec3, getTarget: (() => Vec3) | null = null): void {
        const missile = this.getComponent(ZRSJZ_UluMissile);
        if (!missile) throw new Error('技能_乌鲁缺少 ZRSJZ_UluMissile');
        this._game = ZRSJZ_Game.Instance;
        this._exploded = false;
        this._damage = ZRSJZ_EnhancementService.GetSkillDamage(
            Math.max(0, this.ExplosionDamage) * (1 + ZRSJZ_BoosterShotService.GetBooster('攻击针')),
        );
        missile.RecycleToPool = false;
        missile.Show(start, direction, target, position => this.Explode(position),
            () => this.IsCurrentBattle() && !this._game.GamePaused, this.MovementSpeedMultiplier, getTarget);
    }

    protected update(): void {
        // 切图或战斗结算后不允许在旧场景继续爆炸。
        if (this._game && !this.IsCurrentBattle()) this.node.destroy();
    }

    private IsCurrentBattle(): boolean {
        return isValid(this._game, true) && ZRSJZ_Game.Instance === this._game
            && this._game.node.activeInHierarchy && !this._game.IsGameFinished;
    }

    private Explode(position: Vec3): void {
        if (this._exploded || !this.IsCurrentBattle() || this._game.GamePaused) return;
        this._exploded = true;
        const radius = Math.max(0, this.ExplosionRadius);
        const inRange = (point: Vec3): boolean => Math.hypot(point.x - position.x, point.y - position.y) <= radius;
        for (const enemy of director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? []) {
            if (!isValid(enemy, true) || !enemy.node.activeInHierarchy || enemy.IsDead) continue;
            // 根节点和身体命中点只要任一在范围内，就对该敌人结算一次。
            if (inRange(enemy.node.worldPosition) || (isValid(enemy.Other, true) && inRange(enemy.Other.worldPosition))) {
                enemy.BeHit(this._damage);
            }
        }

        let volume = 0;
        const feedbackRadius = Math.max(1, this.FeedbackRadius);
        for (const player of this._game.Players) {
            if (!isValid(player, true) || !player.node.activeInHierarchy) continue;
            const distance = Math.hypot(player.node.worldPosition.x - position.x, player.node.worldPosition.y - position.y);
            const proximity = Math.max(0, 1 - distance / feedbackRadius);
            volume = Math.max(volume, proximity);
            this._game.Cameras[player.PlayerIndex]?.Shake(this.ShakeStrength * proximity, this.ShakeDuration);
        }
        if (volume > 0 && this.ExplosionSound) {
            ZRSJZ_AudioManager.Instance?.PlaySound(this.ExplosionSound, volume);
        }
    }
}
