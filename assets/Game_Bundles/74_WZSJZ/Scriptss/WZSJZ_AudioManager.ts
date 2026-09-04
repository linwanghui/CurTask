import {
    _decorator,
    assetManager,
    AudioClip,
    AudioSource,
    Button,
    Component,
    director,
    isValid,
    Node,
} from 'cc';
import { BundleManager } from '../../../Scripts/Framework/Managers/BundleManager';

const { ccclass } = _decorator;

/** Audios目录会整目录自动加载，调用方只需传不带扩展名的文件名。 */
@ccclass('WZSJZ_AudioManager')
export class WZSJZ_AudioManager extends Component {
    public static Instance: WZSJZ_AudioManager = null;
    public static AudioSource: AudioSource = null;
    public static AudioMap: Map<string, AudioClip> = new Map<string, AudioClip>();
    public static AudioSourceMap: Map<string, AudioSource> = new Map<string, AudioSource>();

    private static readonly BundleName = '74_WZSJZ';
    private static readonly AudioDirectory = 'Audios';
    private static _isLoading: boolean = false;
    private static _lastPlayTime: Map<string, number> = new Map<string, number>();
    private _boundButtons: WeakSet<Node> = new WeakSet<Node>();

    /** 无需在场景手工挂载；第一次初始化会创建常驻根节点。 */
    public static Initialize(): void {
        if (this.Instance?.node && isValid(this.Instance.node)) return;
        const scene = director.getScene();
        if (!scene) return;
        const node = new Node('WZSJZ_AudioManager');
        scene.addChild(node);
        node.addComponent(AudioSource);
        node.addComponent(WZSJZ_AudioManager);
    }

    /** 真正退出WZSJZ玩法时停止声音并销毁常驻音频节点。 */
    public static DestroyInstance(): void {
        const instance = this.Instance;
        this.AudioSource?.stop();
        for (const source of this.AudioSourceMap.values()) source?.stop();
        this.AudioSourceMap.clear();
        this._lastPlayTime.clear();
        this.Instance = null;
        this.AudioSource = null;
        if (instance?.node && isValid(instance.node)) instance.node.destroy();
    }

    protected onDestroy(): void {
        if (!WZSJZ_AudioManager.Instance || WZSJZ_AudioManager.Instance === this) {
            WZSJZ_AudioManager.Instance = null;
            WZSJZ_AudioManager.AudioSource = null;
            WZSJZ_AudioManager.AudioSourceMap.clear();
        }
    }

    protected onLoad(): void {
        if (WZSJZ_AudioManager.Instance
            && WZSJZ_AudioManager.Instance !== this
            && isValid(WZSJZ_AudioManager.Instance.node)) {
            this.node.destroy();
            return;
        }
        WZSJZ_AudioManager.Instance = this;
        WZSJZ_AudioManager.AudioSource = this.getComponent(AudioSource)
            || this.node.addComponent(AudioSource);
        if (this.node.parent === director.getScene()) {
            director.addPersistRootNode(this.node);
        }
        WZSJZ_AudioManager.Init();
    }

    protected start(): void {
        this.BindNewButtons();
        // UI预制体会动态加载，低频扫描只给新Button补一次监听。
        this.schedule(this.BindNewButtons, 0.5);
    }

    /** 播放一次音效，minimumInterval用于抑制同名高频音效叠成爆音。 */
    public static Play(
        audioName: string,
        volume: number = 1,
        minimumInterval: number = 0.03,
    ): boolean {
        this.Initialize();
        const source = this.AudioSource;
        const clip = this.AudioMap.get(audioName);
        if (!source || !clip) return false;
        const now = Date.now() / 1000;
        const lastTime = this._lastPlayTime.get(audioName) || 0;
        if (now - lastTime < Math.max(0, minimumInterval)) return false;
        this._lastPlayTime.set(audioName, now);
        source.playOneShot(clip, Math.max(0, Math.min(1, volume)));
        return true;
    }

    /** 兼容原有调用名。 */
    public static globalAudioPlay(audioName: string): void {
        this.Play(audioName);
    }

    public static globalAudioPlayByAudioClip(audio: AudioClip): void {
        this.Initialize();
        if (audio && this.AudioSource) this.AudioSource.playOneShot(audio);
    }

    /** 根据距离衰减播放，200像素之外静音。 */
    public static AudioPlay(audioName: string, distance: number): void {
        this.Play(audioName, Math.max(0, Math.min(1, (200 - distance) / 200)));
    }

    public static playLoopAudio(audioName: string, volume: number = 1): void {
        this.Initialize();
        const clip = this.AudioMap.get(audioName);
        if (!clip || !this.Instance?.node) return;
        let source = this.AudioSourceMap.get(audioName);
        if (!source || !isValid(source.node)) {
            const sourceNode = new Node(`循环音效_${audioName}`);
            sourceNode.setParent(this.Instance.node);
            source = sourceNode.addComponent(AudioSource);
            source.loop = true;
            this.AudioSourceMap.set(audioName, source);
        }
        source.clip = clip;
        source.volume = Math.max(0, Math.min(1, volume));
        if (!source.playing) source.play();
    }

    public static StopLoopAudio(audioName: string): void {
        this.AudioSourceMap.get(audioName)?.stop();
    }

    /** 自动读取Audios目录，不再维护硬编码文件名列表。 */
    public static Init(): void {
        if (this._isLoading || this.AudioMap.size > 0) return;
        this._isLoading = true;
        const load = (): void => {
            const bundle = assetManager.getBundle(this.BundleName);
            if (!bundle) {
                this._isLoading = false;
                console.warn('[WZSJZ] 音效分包尚未加载。');
                return;
            }
            bundle.loadDir(this.AudioDirectory, AudioClip, (error, clips: AudioClip[]) => {
                this._isLoading = false;
                if (error) {
                    console.error('[WZSJZ] Audios目录加载失败。', error);
                    return;
                }
                for (const clip of clips || []) this.AudioMap.set(clip.name, clip);
                console.log(`[WZSJZ] 已自动加载${this.AudioMap.size}个音效。`);
            });
        };
        if (assetManager.getBundle(this.BundleName)) load();
        else BundleManager.LoadBundle(this.BundleName, load);
    }

    private BindNewButtons = (): void => {
        const scene = director.getScene();
        if (!scene) return;
        for (const button of scene.getComponentsInChildren(Button)) {
            if (!button?.node || this._boundButtons.has(button.node)) continue;
            this._boundButtons.add(button.node);
            button.node.on(Button.EventType.CLICK, this.PlayButtonClick, this);
        }
    };

    private PlayButtonClick = (): void => {
        WZSJZ_AudioManager.Play('按钮点击', 0.7, 0.04);
    };
}
