import { _decorator, Component, director, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_Skill } from './ZRSJZ_Skill';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_EnemyBase } from '../Controller/ZRSJZ_EnemyBase';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Bomb')
export class ZRSJZ_Bomb extends ZRSJZ_Skill {

    @property({ displayName: "第二阶段动画名称" })
    NextAniName: string = "";

    @property({ displayName: "近距离最大抖动强度", min: 0 })
    MaxShakeStrength: number = 60;

    @property({ displayName: "爆炸抖动时间（秒）", min: 0 })
    ShakeDuration: number = 0.3;

    BombSkeleton: sp.Skeleton = null;
    SkillRange: number = 500;
    SkillDamage: number = 30;

    Init() {
        super.Init();
        this.BombSkeleton = this.node.getChildByName("Bomb").getComponent(sp.Skeleton);
        this.BombSkeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number") {
                switch (event.data.name) {
                    case "gj":
                        this.Attack();
                        break;
                }
            }
        });
    }

    Show(worldPos: Vec3, dirX?: number, dirY?: number, harm: number = 10, cb: Function = null) {
        if (!this.IsInit) {
            this.IsInit = true;
            this.Init();
        }
        this.Harm = harm;
        this.BombSkeleton.node.active = false;
        this.Skeleton.node.active = true;
        this.node.active = true;
        this.node.setWorldPosition(worldPos.clone());
        this.Skeleton.setAnimation(0, this.AniName, false);
        this.Skeleton.setCompleteListener(() => {
            this.Skeleton.node.active = false;
            this.BombSkeleton.node.active = true;
            this.BombSkeleton.setAnimation(0, this.NextAniName, false);
            this.BombSkeleton.setCompleteListener(() => {
                cb && cb();
                const players = director.getScene().getComponentsInChildren(ZRSJZ_Player);
                players.sort((a, b) => Vec3.distance(this.node.worldPosition, a.node.worldPosition) - Vec3.distance(this.node.worldPosition, b.node.worldPosition));
                const distance = Vec3.distance(this.node.worldPosition, players[0].node.worldPosition);
                ZRSJZ_AudioManager.Instance.PlaySound("轰炸", (10000 - distance) / 10000);
                // 每名玩家按各自与爆点的距离抖动对应屏幕；超过声音传播范围时不抖动。
                for (const player of players) {
                    const playerDistance = Vec3.distance(this.node.worldPosition, player.node.worldPosition);
                    const proximity = Math.max(0, Math.min(1, (10000 - playerDistance) / 10000));
                    ZRSJZ_Game.Instance?.Cameras[player.PlayerIndex]?.Shake(
                        this.MaxShakeStrength * proximity,
                        this.ShakeDuration,
                    );
                }
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
        })
    }

    Attack() {
        let enemys = director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? [];
        const currentPosition = this.node.worldPosition;
        enemys = enemys.filter(enemy => !enemy.IsDead);
        enemys.forEach(enemy => {
            if (Vec3.distance(this.node.worldPosition, enemy.node.worldPosition) < this.SkillRange || Vec3.distance(this.node.worldPosition, enemy.Other.worldPosition) < this.SkillRange) {
                enemy.BeHit(this.Harm);
            }
        })
    }

}


