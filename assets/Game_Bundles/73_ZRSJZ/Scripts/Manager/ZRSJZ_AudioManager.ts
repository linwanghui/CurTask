import { _decorator, AudioClip, AudioSource, Component, error, isValid, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_AudioManager')
export class ZRSJZ_AudioManager extends Component {
    public static Instance: ZRSJZ_AudioManager = null;

    public AudioClipMaps: Map<string, AudioClip> = new Map();
    CyclicSoundMap: Map<string, AudioSource> = new Map();
    private idleSources: AudioSource[] = [];
    private _curMusic: string = "";
    private _curMusicAudioSource: AudioSource = null;
    private _soleSoundName: string[] = [];
    private readonly _actionSounds = new Set<{ name: string; source: AudioSource; users: number }>();

    /** 返回本次播放的停止句柄，不复用普通音效池，避免旧动作误停后来播放的音效。 */
    public PlayActionSound(name: string, shared = false): () => void {
        // Spine 内部动画仍叫“奶龙笑”，音效资源已改为面向玩家的新名称。
        if (name === '奶龙笑') name = '捧腹大笑';
        if (ZRSJZ_GameData.Instance.SoundMute) return () => { };
        const clip = this.AudioClipMaps.get(name + '_DLC');
        if (!clip) return () => { }; // 未加载 DLC 音频时保持动作可用。
        let sound: { name: string; source: AudioSource; users: number } = null;
        if (shared) this._actionSounds.forEach(item => {
            if (item.name === name) sound = item;
        });
        if (!sound) {
            const node = new Node('动作音效_' + name);
            this.node.addChild(node);
            const source = node.addComponent(AudioSource);
            source.clip = clip;
            source.loop = false;
            source.volume = 1;
            sound = { name, source, users: 0 };
            this._actionSounds.add(sound);
            const current = sound;
            node.once(AudioSource.EventType.ENDED, () => this.EndActionSound(current));
            source.play();
        }
        const current = sound;
        current.users++;
        let released = false;
        return () => {
            if (released) return;
            released = true;
            if (--current.users === 0) this.EndActionSound(current);
        };
    }

    private EndActionSound(sound: { name: string; source: AudioSource; users: number }): void {
        if (!this._actionSounds.delete(sound)) return;
        if (isValid(sound.source, true)) {
            sound.source.stop();
            sound.source.node.destroy();
        }
    }

    Init() {
        this.node.on(AudioSource.EventType.ENDED, this.onPlayEnded, this);
    }
    public PlayMusic(audioName: string, loop: boolean = true, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.MusicMute || this._curMusic == audioName) return;
        if (!this.AudioClipMaps.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }
        this._curMusic = audioName;
        if (this._curMusicAudioSource) this.freeSource(this._curMusicAudioSource);
        this._curMusicAudioSource = this.getIdleSource();
        this._curMusicAudioSource.clip = this.AudioClipMaps.get(audioName);
        this._curMusicAudioSource.loop = loop;
        this._curMusicAudioSource.volume = valume;
        this._curMusicAudioSource.play();
    }

    public PlayMusicByClip(audioClip: AudioClip, loop: boolean = true, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.MusicMute || this._curMusic == audioClip.name) return;
        if (!audioClip) {
            error(`音频不存在: `);
            return;
        }
        this._curMusic = audioClip.name;
        if (this._curMusicAudioSource) this.freeSource(this._curMusicAudioSource);
        this._curMusicAudioSource = this.getIdleSource();
        this._curMusicAudioSource.clip = audioClip;
        this._curMusicAudioSource.loop = loop;
        this._curMusicAudioSource.volume = valume;
        this._curMusicAudioSource.play();
    }

    public StopMusic() {
        if (this._curMusicAudioSource) {
            this.freeSource(this._curMusicAudioSource);
            this._curMusicAudioSource = null;
            this._curMusic = "";
        }
    }

    public PlaySound(audioName: string, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.AudioClipMaps.has(audioName) && !this.AudioClipMaps.has(audioName + "_DLC")) {
            error(`音频不存在: ${audioName}`);
            return;
        }

        const sound = this.getIdleSource();
        sound.clip = this.AudioClipMaps.get(audioName) || this.AudioClipMaps.get(audioName + "_DLC");
        sound.loop = false;
        sound.volume = valume;
        sound.play();
    }

    public PlaySoundByDLC(audioName: string, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.AudioClipMaps.has(audioName + "_DLC")) {
            error(`音频不存在: ${audioName}`);
            return;
        }

        const sound = this.getIdleSource();
        sound.clip = this.AudioClipMaps.get(audioName + "_DLC");
        sound.loop = false;
        sound.volume = valume;
        sound.play();
    }

    public PlaySoleSound(audioName: string, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.AudioClipMaps.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }
        if (this._soleSoundName.includes(audioName)) return;
        this._soleSoundName.push(audioName);

        const sound = this.getIdleSource();
        sound.clip = this.AudioClipMaps.get(audioName);
        sound.loop = false;
        sound.volume = valume;
        sound.play();
    }

    public PlayCyclicSound(audioName: string, loop: boolean = true, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.AudioClipMaps.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }

        const sound = this.getIdleSource();
        sound.clip = this.AudioClipMaps.get(audioName);
        sound.loop = loop;
        sound.volume = valume;
        sound.play();
        this.CyclicSoundMap.set(audioName, sound);
    }

    public StopCyclicSound(audioName: string) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!this.CyclicSoundMap.has(audioName)) {
            error(`音频不存在: ${audioName}`);
            return;
        }
        const sound = this.CyclicSoundMap.get(audioName);
        sound.clip = null;
        sound.stop();
        this.freeSource(sound);
        this.CyclicSoundMap.delete(audioName);
        console.error(2);
    }

    public PlaySoundByClip(audioClip: AudioClip, valume: number = 1) {
        if (ZRSJZ_GameData.Instance.SoundMute) return;
        if (!audioClip) {
            error(`音频不存在:`);
            return;
        }

        const sound = this.getIdleSource();
        sound.clip = audioClip;
        sound.loop = false;
        sound.volume = valume;
        sound.play();
    }

    private getIdleSource(): AudioSource {
        if (this.idleSources.length <= 0) {
            this.idleSources.push(this.node.addComponent(AudioSource));
        }
        return this.idleSources.shift();
    }

    private freeSource(source: AudioSource) {
        if (this._soleSoundName.includes(source.clip?.name)) {
            this._soleSoundName.splice(this._soleSoundName.indexOf(source.clip?.name), 1);
        }
        source.stop();
        source.clip = null;
        this.idleSources.push(source);

    }

    private onPlayEnded(event: AudioSource) {
        this.freeSource(event);
    }

}


