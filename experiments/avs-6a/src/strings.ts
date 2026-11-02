export const en = {
  title: "3D Athlete Lab",
  intro:
    "Isolated MakeHuman CC0 prototype. Appearance is independent of ASCEND Ratings and equipment.",
  open: "OPEN ATHLETE VIEWER",
  close: "CLOSE",
  loading: "Loading athlete…",
  ready: "Athlete ready",
  error: "3D is unavailable. You can retry or close the viewer.",
  retry: "RETRY",
  reset: "RESET VIEW",
  instructions:
    "Drag to rotate. Pinch to zoom. Buttons provide the same controls.",
  front: "FRONT",
  side: "SIDE",
  back: "BACK",
  left: "ROTATE LEFT",
  right: "ROTATE RIGHT",
  zoomIn: "ZOOM IN",
  zoomOut: "ZOOM OUT",
  paused: "Viewer paused in background.",
  language: "Language",
  selected: "Selected",
  source: "Fixed-pose CC0 athlete • prototype apparel",
  failureTest: "SIMULATE LOAD ERROR",
} as const;
export type Locale = "en" | "ja";
export type Key = keyof typeof en;
export const ja: Record<Key, string> = {
  title: "3Dアスリートラボ",
  intro:
    "MakeHumanのCC0素材を使った独立プロトタイプです。外見はASCENDの能力値・装備と連動しません。",
  open: "アスリートビューアを開く",
  close: "閉じる",
  loading: "アスリートを読み込み中…",
  ready: "アスリートを表示中",
  error: "3Dを表示できません。再試行するか、ビューアを閉じてください。",
  retry: "再試行",
  reset: "視点をリセット",
  instructions: "ドラッグで回転、ピンチでズーム。ボタンでも操作できます。",
  front: "正面",
  side: "側面",
  back: "背面",
  left: "左に回転",
  right: "右に回転",
  zoomIn: "拡大",
  zoomOut: "縮小",
  paused: "バックグラウンドで表示を一時停止しています。",
  language: "言語",
  selected: "選択中",
  source: "固定ポーズのCC0モデル・試作トレーニングウェア",
  failureTest: "読込エラーをテスト",
};
export function translate(locale: Locale, key: Key): string {
  return (locale === "ja" ? ja : en)[key];
}
