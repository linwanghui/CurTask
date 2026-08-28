"""Generate the original WZSJZ cartoon tower-defense SFX set as mono PCM WAV."""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parents[1] / "Audios"
RNG = random.Random(7401)


def tone(buf, start, duration, f0, f1=None, amp=.4, decay=4., square=False):
    f1 = f0 if f1 is None else f1
    begin, count = int(start * RATE), int(duration * RATE)
    phase = 0.0
    for i in range(count):
        t = i / RATE
        p = i / max(1, count - 1)
        freq = f0 + (f1 - f0) * p
        phase += 2 * math.pi * freq / RATE
        wave_value = (1 if math.sin(phase) >= 0 else -1) if square else math.sin(phase)
        env = min(1., t / .008) * math.exp(-decay * p)
        if begin + i < len(buf):
            buf[begin + i] += wave_value * amp * env


def noise(buf, start, duration, amp=.5, decay=5., smooth=.15):
    begin, count, filtered = int(start * RATE), int(duration * RATE), 0.0
    for i in range(count):
        raw = RNG.uniform(-1., 1.)
        filtered += (raw - filtered) * smooth
        p = i / max(1, count - 1)
        env = min(1., i / (RATE * .004)) * math.exp(-decay * p)
        if begin + i < len(buf):
            buf[begin + i] += filtered * amp * env


def create(name, duration, recipe):
    buf = [0.0] * int(duration * RATE)
    recipe(buf)
    peak = max(.001, max(abs(v) for v in buf))
    gain = min(1., .9 / peak)
    # very short edge fade prevents clicks in compressed builds
    fade = min(220, len(buf) // 8)
    samples = []
    for i, value in enumerate(buf):
        edge = min(1., i / max(1, fade), (len(buf) - 1 - i) / max(1, fade))
        samples.append(int(max(-1., min(1., value * gain * edge)) * 32767))
    path = OUT / f"{name}.wav"
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(struct.pack(f"<{len(samples)}h", *samples))


def chime(notes, decay=5., amp=.38):
    def recipe(buf):
        for start, frequency in notes:
            tone(buf, start, len(buf) / RATE - start, frequency, amp=amp, decay=decay)
            tone(buf, start, len(buf) / RATE - start, frequency * 2.01, amp=amp * .14, decay=decay * 1.2)
    return recipe


def impact(low=100, noise_amp=.7, metallic=False):
    def recipe(buf):
        noise(buf, 0, len(buf) / RATE, noise_amp, 7., .28)
        tone(buf, 0, len(buf) / RATE, low, low * .55, .65, 6.)
        if metallic:
            tone(buf, 0, len(buf) / RATE, 920, 680, .35, 4.)
            tone(buf, .01, len(buf) / RATE - .01, 1430, 1160, .18, 5.)
    return recipe


def whoosh(f0=900, f1=180, amp=.6):
    def recipe(buf):
        noise(buf, 0, len(buf) / RATE, amp, 3., .08)
        tone(buf, 0, len(buf) / RATE, f0, f1, amp * .3, 4.)
    return recipe


def boom(buf):
    noise(buf, 0, len(buf) / RATE, .85, 5., .12)
    tone(buf, 0, len(buf) / RATE, 125, 42, .9, 3.5)
    tone(buf, .025, len(buf) / RATE - .025, 62, 34, .65, 2.8)


def electromagnetic(buf):
    tone(buf, 0, len(buf) / RATE, 120, 880, .35, 1.2, True)
    for i in range(7):
        tone(buf, .09 * i, .16, 1300 + i * 170, 500 + i * 50, .22, 4.)
    noise(buf, .36, .24, .35, 4., .05)


def heal(buf):
    for i, note in enumerate((523, 659, 784, 1047)):
        tone(buf, i * .11, .42, note, note * 1.02, .3, 3.4)


def gun(buf):
    noise(buf, 0, .13, .9, 11., .65)
    tone(buf, 0, .16, 185, 58, .7, 8.)


def cannon(buf):
    noise(buf, 0, .32, .9, 6., .22)
    tone(buf, 0, .42, 105, 38, .9, 4.)
    tone(buf, .035, .3, 52, 31, .7, 3.)


def merge(buf):
    noise(buf, 0, .22, .15, 5., .08)
    for i, note in enumerate((392, 523, 659, 784, 1047)):
        tone(buf, i * .075, .28, note, note * 1.08, .3, 3.5)


def reward(buf):
    for i, note in enumerate((784, 988, 1175, 1568)):
        tone(buf, i * .09, .3, note, amp=.32, decay=4.)


def recycle(buf):
    noise(buf, 0, .33, .35, 2.5, .06)
    tone(buf, 0, .35, 800, 105, .55, 2.5)


def death(buf):
    noise(buf, .08, len(buf) / RATE - .08, .45, 4., .2)
    tone(buf, 0, len(buf) / RATE, 360, 72, .65, 2.5)


SOUNDS = {
    "按钮点击": (.10, chime([(0, 980)], 8., .42)),
    "界面打开": (.28, chime([(0, 523), (.07, 784), (.14, 1047)], 5.)),
    "界面关闭": (.22, chime([(0, 784), (.07, 523), (.13, 330)], 6., .3)),
    "购买成功": (.42, reward),
    "操作失败": (.26, chime([(0, 180), (.08, 145)], 2.8, .48)),
    "奖励获得": (.52, reward),
    "拖拽开始": (.16, whoosh(260, 760, .32)),
    "物品放置": (.18, impact(155, .42)),
    "交换位置": (.28, whoosh(720, 220, .42)),
    "合成升级": (.58, merge),
    "格子解锁": (.46, chime([(0, 330), (.08, 659), (.17, 988)], 4., .38)),
    "回收": (.38, recycle),
    "枪发射": (.18, gun),
    "炮发射": (.46, cannon),
    "近战挥砍": (.25, whoosh(1250, 190, .68)),
    "子弹命中": (.18, impact(210, .48)),
    "爆炸": (.62, boom),
    "地雷爆炸": (.72, boom),
    "盾牌飞出": (.30, whoosh(520, 1040, .45)),
    "盾牌命中": (.34, impact(135, .5, True)),
    "技能释放": (.62, chime([(0, 220), (.10, 440), (.22, 880), (.33, 1320)], 2.8)),
    "电磁脉冲": (.72, electromagnetic),
    "治疗": (.74, heal),
    "城墙受击": (.30, impact(82, .85)),
    "敌人受击": (.18, impact(125, .5)),
    "敌人死亡": (.48, death),
    "Boss受击": (.28, impact(72, .72, True)),
    "Boss死亡": (.95, death),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (duration, recipe) in SOUNDS.items():
        create(name, duration, recipe)
    print(f"generated {len(SOUNDS)} original sound effects in {OUT}")


if __name__ == "__main__":
    main()
