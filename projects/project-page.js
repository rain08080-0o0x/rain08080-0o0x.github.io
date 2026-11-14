const projectData = {
  naraku: {
    kind: "Personal / DirectX11", title: "奈落塔", lead: "「まだ潜るか、もう帰るか」を中心判断にした2.5D探索サバイバルローグライト。ゲーム本体と専用Editorを分離し、生成・検証・発行まで含めて制作しています。",
    summary: "小さな地形ピースを条件に沿って組み合わせ、探索するたびに異なる塔を生成するゲームです。HP、スタミナ、精神力、所持重量を探索と帰還の判断へ結び付けています。",
    tools: ["Visual Studio 2022","Fork","GitHub","C++","DirectX11","DirectXMath","ImGui","JSON","PowerShell","Markdown"], role: "個人制作。外部ライブラリとフリーアセットを除き、企画、ゲームシステム、描画、Editor、データ検証、ビルド構成を担当。", period: "2026/05–開発中", github: "https://github.com/rain08080-0o0x/SurvivalRoguelike",
    gallery: [
      {image:"../image/survival-Editor.png", alt:"奈落塔の地形エディタ", caption:"地形の形状、開始・帰還地点、接続条件を編集する専用Editor。"},
      {diagram:["大ステージを一括編集","小ステージへ分割","条件から自動生成"], caption:"一枚の巨大ステージから、再利用可能な小ステージ群へ方針を変更。"},
      {diagram:["接続属性を記録","隣接辺を照合","不整合なら候補から除外"], caption:"接続属性とタグによる組み合わせ制御。"},
      {diagram:["Editorで保存","整合性を検証","バックアップ後にゲームへ発行"], caption:"壊れたデータをゲーム側へ渡さない発行パイプライン。"}
    ],
    sections: [
      {title:"一枚の大ステージから、小ステージを複数作る方式へ", intro:"大きなマップを一枚ずつ作る方式では、制作量が増え、変更の再利用も難しくなりました。そこで地形を小さなピースへ分け、条件に沿って組み合わせる構造へ変更しました。", points:[
        ["原因","編集範囲が大きすぎる","一部を変更するだけでも全体確認が必要で、ステージ数に比例して作業量が増えていました。"],
        ["変更","16×16等の小ステージ化","独立した地形ピースとして保存し、役割・階層・接続条件をデータとして持たせました。"],
        ["結果","再利用と自動生成","同じピースを別の組み合わせで利用でき、固定マップ制作と生成テストを分離できました。"]], diagram:["Stage Editorで一枚を制作","Piece Editorで部品化","Generatorが4×4等へ構成"]},
      {title:"接続属性とタグで、つながらない組み合わせを避ける", intro:"複数の小ステージを無条件に並べると、通路が壁へ接続する、開始地点へ到達できないといった問題が起きます。各辺の属性と役割タグを候補選定へ使い、配置前に不整合を除外します。", points:[
        ["接続属性","四辺の条件を保存","上下左右それぞれに接続IDや通行条件を持たせ、隣接ピースと比較します。"],
        ["役割タグ","開始・帰還・入口・出口","通常ピースと特殊ピースを分類し、必要な役割が生成結果へ含まれるようにします。"],
        ["回避処理","候補を配置前に絞る","接続面、高低差、最大斜度などを満たさないピースは抽選候補から外します。"]], diagram:["候補ピースを分類","隣接辺とタグを照合","成立する候補だけ配置"]},
      {title:"保存時の検証を、発行前の防波堤にする", intro:"JSONとして保存できることと、ゲームで利用できることは別です。Editor内の保存検証とゲーム側への発行検証を分け、欠落や到達不能をゲーム実行前に見つけます。", points:[
        ["保存検証","ピース単体を確認","開始・帰還地点、四辺の接続条件、参照モデルなど、単体で確定できる項目を確認します。"],
        ["生成検証","組み合わせ後を確認","必須ピース、到達可能性、歩行可能な最大斜度を生成結果に対して検査します。"],
        ["発行","置換前に退避","検証後にゲーム側へ同期し、既存データを世代バックアップして復元可能にします。"]], diagram:["編集中データを保存","単体・生成結果を検証","成功時だけ発行"]},
      {title:"軽量化のためのプロファイラが、負荷の原因になった", intro:"重い場所を特定するために細粒度計測を204か所へ入れましたが、全頂点・全セル走査の内側でも計測処理が走り、Editor本体より計測管理が重くなる場面がありました。", points:[
        ["計測","関数単位で時間を収集","時計取得、関数名処理、マップ更新を細かな関数ごとに実行していました。"],
        ["原因","計測自体のオーバーヘッド","F3でウィンドウを閉じても計測が継続し、高頻度関数では測定値の信頼性も下がりました。"],
        ["改善","必要なときだけ計測","非表示中はScopeを早期終了し、高頻度の投影処理から細粒度計測を外しました。"]], diagram:["外部フレーム計測で入口を特定","大きな処理単位だけ計測","表示中だけ詳細計測"]},
      {title:"ゲームとEditorを別実行ファイルへ分離", intro:"制作機能をゲームReleaseへ含めると、不要なコード・データ・Windows固有処理まで配布対象になります。ゲーム、Editor、既存基盤の3プロジェクトへ責務を分けました。", points:[
        ["NarakuGame","遊ぶための実行系","ゲームシーンと必要なAssetsだけを持ち、ReleaseではEditor機能を含めません。"],
        ["NarakuEditor","作るための実行系","ピース編集、生成プレビュー、検証、発行を担当します。"],
        ["共有","共通基盤のみ再利用","描画・数学・データ型など必要な基盤を共有し、発行データを境界にします。"]], diagram:["NarakuEditorで制作・検証","MapsとModelを発行","NarakuGameが読込"]}
    ]
  },
  physics: {
    kind:"Personal / Simulation", title:"Physics & Particle Lab", lead:"ばね、連結ゴム、風の流れ、花火を、式とパラメーターから観察するDirectX11実験環境。",
    summary:"物理エンジンへ任せず、力・速度・位置を自分で更新し、ImGuiから値を変えて結果を比較する技術検証です。", tools:["Visual Studio 2022","C++","DirectX11","DirectXMath","ImGui","GitHub","Fork"], role:"個人制作。シミュレーション計算、描画、パーティクル管理、ImGui調整画面を担当。", period:"2026/07", github:null,
    gallery:[{diagram:["自然長との差","張力・重力・減衰","速度と位置を更新"],caption:"ばねと連結ゴムの計算。"},{diagram:["SDFで箱との距離を取得","法線方向へ回避・押し戻し","後流・渦・再循環を加算"],caption:"風粒子と障害物の相互作用。"},{diagram:["Rising","Blooming","Scattering / Finished"],caption:"花火を状態で分け、5種類の開花を生成。"}],
    sections:[
      {title:"力を分けて、ばねの動きを読める形にする",intro:"自然長との差から張力を求め、重力と減衰抵抗を加えて速度・位置を更新します。連結ゴムでは10点の隣接関係を同じ考え方で処理します。",points:[["入力","位置・自然長・ばね定数","現在長と自然長の差が、戻ろうとする力の大きさになります。"],["合力","張力＋重力＋減衰","それぞれの力を分け、どの値が揺れへ影響したかを調整しやすくしました。"],["更新","加速度から位置へ","質量で加速度を求め、速度、位置の順に反映します。"]],diagram:["長さを測る","合力を求める","速度・位置を積分"]},
      {title:"障害物の後ろまで含めて風を表現",intro:"箱との衝突回避だけでは、粒子が障害物の横へ逸れるだけです。符号付き距離と法線を使った押し戻しに、後流半径、速度低下、再循環、渦、周囲粒子の巻き込みを加えました。",points:[["接近","SDFと法線","箱からの距離と最短方向を求め、側面へ誘導します。"],["通過後","後流と渦","障害物の後ろでは流速と半径を変え、単純な直線へすぐ戻らないようにします。"],["軽量化","粒子を再配置","領域外へ出た粒子を入口へ戻し、無制限な生成を避けています。"]],diagram:["+X方向へ流す","箱の周囲で分流","後方で減速・旋回"]},
      {title:"花火の一生を状態として分ける",intro:"上昇、開花、散開、終了を状態として扱い、球状・柳・輪・牡丹・菊の5パターンで初速と方向を変えます。",points:[["上昇","打ち上げ粒子","速度と軌跡を描き、開花条件まで上昇させます。"],["開花","方向分布を生成","種類ごとに球面、輪、垂れ方などの分布を変えます。"],["終了","寿命で除去","散開後にFinishedとなった要素を削除し、残留を防ぎます。"]],diagram:["Rising","Blooming","Scattering → Finished"]}
    ]
  },
  assetbundle: {
    kind:"Personal / Unity",title:"AssetBundle Loading Sample",lead:"AssetBundleの生成、配置、実行時ロード、Sprite生成を2Dシューティングへ組み込んだ技術検証。",summary:"背景とスプライトシートを個別または一括でBundle化し、StreamingAssetsからゲーム実行中に読み込みます。",tools:["Unity 2022.3","C#","AssetBundle","Unity Editor","Visual Studio"],role:"個人の技術検証。Bundle生成用Editorコードと、実行時ロード・Sprite分割処理を担当。",period:"2026/01",github:null,
    gallery:[{image:"../image/projects/assetbundle/background.png",alt:"Bundle化する背景素材",caption:"背景用Bundleへ格納するTexture2D。"},{image:"../image/projects/assetbundle/sprites.png",alt:"Bundle化するスプライトシート",caption:"実行時に範囲を切り出すスプライトシート。"},{diagram:["EditorでBuildPipelineを実行","StreamingAssetsへ配置","LoadFromFile / LoadAsset"],caption:"生成から実行時ロードまでの流れ。"}],
    sections:[{title:"EditorメニューからBundleを生成",intro:"背景とスプライトを別々にした構成と、一つへまとめた構成を用意し、Bundleの分け方を比較できるようにしました。",points:[["入力","Texture2Dを指定","背景とスプライトシートをBundleBuildへ登録します。"],["生成","BuildPipeline","StandaloneWindows64向けにBundleファイルを生成します。"],["比較","個別と一括","更新単位や読み込み単位を考えるため、粒度の違う構成を作りました。"]],diagram:["bundle001: 背景","bundle002: スプライト","bundle_ex: 一括"]},{title:"実行時に読み込み、Spriteへ変換",intro:"StreamingAssetsのパスからBundleを開き、Texture2Dを取得します。スプライトシートは必要な矩形へ分けてSprite.Createへ渡します。",points:[["読込","AssetBundle.LoadFromFile","ゲーム実行中にファイルを開きます。"],["取得","LoadAsset<Texture2D>","Bundle内の画像をTexture2Dとして取得します。"],["生成","Sprite.Create","1枚のシートから複数の表示用Spriteを作ります。"]],diagram:["Bundleファイル","Texture2D","複数Sprite"]},{title:"検証範囲を明確にする",intro:"この作品はAssetBundleの基本フローを確認するサンプルです。非同期ロードやダウンロード配信、メモリ解放の最適化までは実装対象に含めていません。",points:[["確認済み","BuildとLoad","Editor生成とローカル読込をゲームへ組み込みました。"],["ゲーム","2Dシューティング","読み込んだ背景とキャラクター画像を実際の画面で使用します。"],["今後","非同期・配信","実運用を想定する場合に必要な追加検証として切り分けています。"]],diagram:["学習対象を限定","小さく実装","次の課題を残す"]}]
  },
  chinchiro: {
    kind:"Personal / Physics",title:"チンチロローグライク",lead:"投げたダイスが衝突し、回転して止まる過程を、そのまま出目とゲームルールへつなげた試作。",summary:"OBBによる衝突とRigidBodyの運動を自作し、乱数だけではないダイスの手触りを目指しました。",tools:["Visual Studio 2022","C++","DirectX11","DirectXMath","ImGui","OBB","RigidBody"],role:"個人制作。外部ライブラリと素材を除き、衝突、物理挙動、ゲームルール、調整を担当。",period:"2025/10–2025/12",github:null,
    gallery:[{image:"../image/dice.png",alt:"ダイスのゲーム画面",caption:"複数のダイスを投げて出目を判定。"},{image:"../image/powerpoint/tintiro_box.png",alt:"OBBの解説",caption:"回転した箱形状に合わせるOBB。"},{image:"../image/powerpoint/tintiro_rigidboy1.png",alt:"RigidBody処理の解説",caption:"物理挙動をRigidBodyへ集約。"},{image:"../image/powerpoint/tintiro_rigidboy2.png",alt:"RigidBodyの更新処理",caption:"重力・摩擦・回転・停止を段階化。"},{image:"../image/powerpoint/tintiro_vec3.png",alt:"ベクトル補助処理",caption:"DirectXMathを扱いやすくする補助処理。"}],
    sections:[{title:"見た目と判定を合わせるOBB",intro:"軸に平行な箱判定では、ダイスが回転したときに見た目と当たり判定がずれます。モデルの向きを含むOBBを使い、面と辺の関係から衝突を扱います。",points:[["課題","回転で判定がずれる","AABBでは画面上の角度と判定形状が一致しません。"],["選定","OBB","中心、各軸、半径を持ち、回転した箱同士を比較できます。"],["効果","出目へ反映","実際の姿勢で止まった上面を出目として扱えます。"]],diagram:["姿勢をOBBへ反映","分離軸で衝突判定","停止後の上面を取得"]},{title:"RigidBodyへ運動の責務をまとめる",intro:"ゲーム側へ重力や摩擦を直接書かず、速度、角速度、質量、減衰、停止判定をRigidBodyへまとめました。",points:[["入力","力とトルク","投擲や衝突から運動量を受け取ります。"],["更新","重力・摩擦・回転","各要素を分け、パラメーターを比較しやすくしました。"],["停止","閾値で安定化","小さな速度が残り続けないよう、停止条件を設けます。"]],diagram:["力を蓄積","速度・角速度を更新","姿勢を反映"]},{title:"調整可能な物理として組み込む",intro:"正確さだけでなく、ゲームとして待ち時間が長すぎないことも必要です。ImGuiで値を変え、転がり方と停止までの時間を確認しました。",points:[["観察","値と見た目を並べる","速度や回転と実際の挙動を同時に確認します。"],["補助型","ベクトル変換を整理","XMVECTORとXMFLOAT3の受け渡しを補助し、式を読みやすくしました。"],["課題","負荷との両立","衝突形状と計算量のバランスは継続課題として残しました。"]],diagram:["値を変更","複数回投擲","停止時間と挙動を比較"]}]
  },
  creator: {
    kind:"Team / Unity",title:"CreatorKousien",lead:"フィールド探索とカードバトルを組み合わせたチーム制作。ゲーム機能と、他メンバーが使うUnity Editor拡張を並行して開発しました。",summary:"データを探す、UIを繰り返し置く、演出方向を再生して確認するといった制作上の反復をEditorツールへ置き換えました。",tools:["Unity","C#","URP","Unity Editor","ScriptableObject","GitHub","Fork"],role:"企画2名・プログラマー7名・デザイナー3名。プレイヤー、収集物、敵、UI、Editorツールを担当。",period:"2026/02–2026/06",github:"https://github.com/aptmara/CreatorKousien",
    gallery:[{image:"../image/powerpoint/CreaterKousien.png",alt:"ゲーム画面",caption:"フィールド探索のゲーム画面。"},{image:"../image/powerpoint/CreaterKousien_SO_Editor.png",alt:"ScriptableObject管理画面",caption:"ScriptableObjectを一覧・検索・編集。"},{image:"../image/powerpoint/CreaterKousien_UI_Editor.png",alt:"UI作成Editor",caption:"Canvas下へUI要素を一括生成。"},{image:"../image/powerpoint/CreaterKousien_Vector_View.png",alt:"収集物の方向表示",caption:"Gizmoで移動方向と広がりを可視化。"}],
    sections:[{title:"ScriptableObjectを一覧から管理",intro:"データ数が増えるとProjectビューから目的のアセットを探す時間が増えます。一覧、検索、並べ替え、編集を一つのEditorへまとめました。",points:[["問題","アセット探索の反復","フォルダを往復して個別Inspectorを開く必要がありました。"],["実装","管理ウィンドウ","対象型の収集、検索、選択、編集を同じ画面で行います。"],["意図","企画も扱える","コードを触らずデータを比較・調整できる状態を目指しました。"]],diagram:["対象Assetを収集","検索・並べ替え","選択して編集"]},{title:"UIの繰り返し配置を一括生成",intro:"CanvasへImageやTextを一つずつ作り、同じ設定を繰り返す作業を減らすため、必要なUIをまとめて生成するツールを作りました。",points:[["入力","種類と個数を指定","作成するImage／Textと親Canvasを指定します。"],["生成","階層へ一括配置","命名と初期設定を揃えてGameObjectを作ります。"],["効果","設定漏れを抑える","同じ作業を各担当者が手で繰り返す状態を避けます。"]],diagram:["作成条件を選ぶ","GameObjectを生成","Canvasへ整列"]},{title:"方向をGizmoで見てから再生する",intro:"収集物が飛ぶ方向と拡散範囲は、数値だけでは結果を想像しづらい項目です。Sceneビューへベクトルを描き、再生前に確認できるようにしました。",points:[["可視化","方向と広がり","基準方向とランダム幅をGizmoで表示します。"],["調整","Sceneビューで比較","対象を見ながら値を変え、向きの誤りを早く見つけます。"],["共同制作","他職種へ渡す","演出担当がプログラマーを待たずに調整できる形を目指しました。"]],diagram:["値を入力","Gizmoで範囲確認","Playで最終確認"]}]
  },
  filezipper: {
    kind:"Personal / Desktop tool",title:"FileZipper",lead:"課題提出時のファイル抽出、名前変更、Zip圧縮を一画面へまとめたWPFデスクトップツール。",summary:"毎回手作業で必要ファイルを探す負担と、入れ忘れ・命名ミスを減らすために制作しました。",tools:["Visual Studio","C#","WPF",".NET 8","XAML"],role:"個人制作。UI、ファイル抽出、Zip圧縮、インストーラー、利用説明を担当。",period:"2025/05",github:null,
    gallery:[{image:"../image/powerpoint/FileZIpper.png",alt:"FileZipperのメイン画面",caption:"抽出対象の確認からZip化までを一画面で操作。"},{image:"../image/powerpoint/FileZIpper_tutorial.png",alt:"利用説明",caption:"導入と操作をまとめたチュートリアル。"},{image:"../image/powerpoint/FileZIpper_Installer.png",alt:"インストーラー",caption:"ほかの利用者へ渡せるインストーラーを用意。"}],
    sections:[{title:"手作業の提出準備を一本道にする",intro:"提出のたびにフォルダを開き、必要なファイルを探し、名前を確認して圧縮する作業が発生していました。操作順を固定し、一つの画面から完了できるようにしました。",points:[["選択","対象フォルダを指定","元データを壊さず、抽出元を選びます。"],["確認","必要ファイルを一覧化","Zipへ含める対象を圧縮前に確認します。"],["出力","命名してZip化","提出規則に合わせた名前で圧縮します。"]],diagram:["フォルダ選択","対象確認・命名","Zip出力"]},{title:"処理だけでなく、配布まで仕上げる",intro:"自分の環境で動くだけでは、ほかの利用者へ渡せません。インストーラーと操作説明を用意し、導入から利用までを確認できる形にしました。",points:[["UI","一画面で完結","次に行う操作が分散しないようにしました。"],["説明","画像付き手順","初めて使う人が導入と出力を追える資料を作りました。"],["配布","インストーラー","実行ファイルを直接探さず導入できる形に整えました。"]],diagram:["ビルド","インストーラー化","説明と一緒に配布"]}]
  },
  pmx: {
    kind:"Personal / Graphics tool",title:"pmxConverter",lead:"PMXモデルのボーン、モーション、ウェイトを編集し、glTF 2.0へ出力するC++グラフィックスツール。",summary:"モデル確認から簡単な修正、アニメーション調整、汎用形式への書き出しまでを一つの画面で行います。",tools:["Visual Studio 2022","C++20","OpenGL 3.3","Dear ImGui","CMake","glTF 2.0"],role:"個人制作。PMX読込、編集UI、ボーン・アニメーション・IK・ウェイト処理、glTF出力を担当。",period:"2026/07–2026/08",github:null,
    gallery:[{diagram:["PMXを読み込む","ボーン・モーション・ウェイトを編集","glTF 2.0へ出力"],caption:"モデル編集から汎用形式出力までの流れ。"},{diagram:["キーを選択","W / E / R Gizmoで変換","線形・Quaternion補間"],caption:"モーション編集と再生。"},{diagram:["2ボーンIK","ポールで曲がる向きを指定","疑似地面へ足を調整"],caption:"姿勢補正の構成。"}],
    sections:[{title:"ボーンとモーションを画面上で編集",intro:"ボーン階層、レイヤー、軌跡を表示し、選択したキーを移動・回転・拡縮Gizmoで編集します。",points:[["表示","階層と軌跡","複数のモーション軌跡を重ね、動きの流れを確認します。"],["編集","W / E / R Gizmo","ローカル・ワールド座標を切り替えてキーを操作します。"],["復元","Undo / Redo","履歴を最大64件に制限し、編集のやり直しとメモリ使用量を両立します。"]],diagram:["ボーンを選択","キーを変換","補間して再生"]},{title:"IKとウェイトを同じツールで調整",intro:"2ボーンIKとポール指定、疑似地面への足位置調整を実装し、変形結果を見ながら頂点ウェイトも編集できます。",points:[["IK","2関節を解析","始点・中間・終点とターゲットから姿勢を求めます。"],["ポール","曲がる面を決定","肘や膝が反対方向へ折れないようにします。"],["ウェイト","最大4影響","頂点あたりの影響ボーンを4つに制限して編集・出力します。"]],diagram:["ターゲットを配置","IKで姿勢計算","ウェイトで変形"]},{title:"作業状態とモデル本体を分けて保存",intro:"作業ファイルへモデル全体を複製せず、元PMXへの参照とハッシュ、編集状態を保存します。",points:[[".pmxwork","編集状態を記録","表示、選択、モーション等の作業情報を保存します。"],["参照","元PMXを再利用","大きなモデルデータの重複保存を避けます。"],["出力","glTF 2.0","メッシュ、マテリアル、PNG、スキン、ボーンアニメーションを変換します。"]],diagram:["元PMX＋ハッシュ","作業状態 .pmxwork","必要時にglTF出力"]}]
  },
  joya: {
    kind:"Personal / Unity Physics",title:"JoyaBellBozu",lead:"二重振り子の運動方程式を固定時間刻みのRK4で解き、鐘への打撃を判定するゲーム。",summary:"Rigidbody、Joint、ArticulationBodyに任せず物理を計算し、同じ条件から同じ結果を再生できる検証可能な構成にしました。",tools:["Unity 6","C#","RK4","BoxCastAll","ComputePenetration","GitHub"],role:"個人制作。運動方程式、衝突・打撃判定、状態遷移、リプレイを担当。公開作品の構造を題材にクリーンルームで再構成。",period:"2026/09",github:"https://github.com/rain08080-0o0x/JoyaBellBozu",
    gallery:[{image:"../image/projects/joya/game.png",alt:"JoyaBellBozuのゲーム画面",caption:"ハンマーを振り上げて鐘を狙う画面。"},{image:"../image/projects/joya/preview.png",alt:"振り子のプレビュー",caption:"二重振り子の動作確認。"},{image:"../image/projects/joya/preview-impact.png",alt:"衝突時のプレビュー",caption:"鐘との衝突・打撃確認。"}],
    sections:[{title:"二重振り子をRK4で積分",intro:"角度と角速度を状態として持ち、連成した運動方程式を固定時間刻みで更新します。1回のFixedUpdateを8分割し、大きな刻みによる不安定化を抑えます。",points:[["状態","2つの角度と角速度","前フレームから連続する運動を保持します。"],["積分","4次Runge-Kutta法","複数の傾きを評価し、単純Euler法より誤差を抑えます。"],["安定化","8サブステップ","描画フレームではなく固定刻みをさらに分割します。"]],diagram:["状態から微分を評価","RK4で次状態を計算","8回反復して反映"]},{title:"高速移動でも接触を取りこぼさない",intro:"ハンマーヘッドの移動区間をBoxCastAllで調べ、ComputePenetrationで重なりを解消します。接触時の相対法線速度と質量から打撃を判定します。",points:[["Sweep","移動区間を検査","前位置から現在位置までを掃引し、すり抜けを抑えます。"],["補正","ComputePenetration","重なり量と方向を取得して位置を戻します。"],["打撃","相対法線速度","単なる接触ではなく、鐘へ向かう速度を評価します。"]],diagram:["BoxCastAll","接触点・法線を取得","速度と質量からHit判定"]},{title:"乱数を使わず、同条件を再生",intro:"物理計算へ乱数を入れず、初期条件と入力が同じなら同じ結果になる構成にしました。設定、プレイ、打撃、108回到達、失敗、結果、再プレイを状態として管理します。",points:[["再現性","同じ初期値","不具合の再現とパラメーター比較を行いやすくします。"],["進行","状態を明示","画面と入力を現在状態へ対応させます。"],["記録","ハンマー別スコア","条件ごとの結果を比較できます。"]],diagram:["Setup","Play / Hit / Break","Result / Replay"]}]
  },
  perforce: {
    kind:"Learning / Version control",title:"Perforce / P4V",lead:"基本的なWorkspace操作と、集中型バージョン管理の流れを学習した記録。",summary:"完成作品ではなく、チーム開発で使われるPerforceとP4Vの基本概念を理解するための学習項目です。",tools:["Perforce","P4V","Workspace","Version Control"],role:"個人学習。P4V上の基本的なWorkspace操作とバージョン管理の流れを確認。",period:"記録未確認",github:null,
    gallery:[{diagram:["Depot上のデータ","Workspaceへ対応付け","ローカルで確認"],caption:"DepotとWorkspaceの関係を学習。"},{diagram:["対象を確認","バージョン管理操作","履歴として管理"],caption:"P4Vを使った基本操作の位置づけ。"}],
    sections:[{title:"Workspaceを通して管理対象を見る",intro:"PerforceではDepot上のデータとローカルフォルダの対応をWorkspaceで定義します。Gitとは異なる考え方を、P4Vの画面操作から確認しました。",points:[["Depot","管理側のデータ","サーバーで管理されるファイルの位置づけを学びました。"],["Workspace","対応関係","管理対象をローカルのどこへ置くかという考え方を確認しました。"],["P4V","GUIで確認","ツリーと状態表示から、管理対象を確認する基本操作を学びました。"]],diagram:["Depot","Workspace mapping","Local files"]},{title:"作品ではなく、学習項目として掲載",intro:"当時のサーバー環境と操作記録を現在確認できないため、確認できる範囲を超えた実績は記載せず、基本操作の学習項目として整理しています。",points:[["掲載範囲","基本操作のみ","Workspace操作とバージョン管理学習として扱います。"],["記載しない内容","未確認の運用実績","ブランチ戦略や大規模チーム運用などは主張しません。"],["目的","ツールの違いを知る","Git系以外の管理方式へ触れた経験として整理しています。"]],diagram:["確認できる事実","掲載内容を限定","誤解のない表現"]}]
  },
  shigoto: {
    kind:"Personal / DirectX11",title:"仕事猫：無限残業編",lead:"2.5Dアクション・ローグライクに、設定UI、段階式強化、ゲーム内エフェクト制作環境を組み込んだ作品。",summary:"遊ぶための機能だけでなく、演出を実行中に作って確認できる調整環境を自作エンジンへ追加しました。",tools:["Visual Studio 2022","C++","DirectX11","ImGui","JSON"],role:"個人制作。外部ライブラリと素材を除き、設定、アップグレードUI、エフェクトEditorを担当。",period:"2025/12–2026/05",github:null,
    gallery:[{image:"../image/effect.png",alt:"エフェクト調整画面",caption:"粒子の値を実行中に変更するエフェクトEditor。"},{image:"../image/genba-keyconfig.png",alt:"キーコンフィグ",caption:"キー割り当てを変更する設定画面。"},{image:"../image/genba-mucis.png",alt:"音量設定",caption:"音量と表示環境の設定画面。"}],
    sections:[{title:"設定をゲーム外の前提にしない",intro:"キー割り当て、音量、フルスクリーン／ウィンドウをゲーム内から変更できるようにし、環境に合わせて遊べる入口を整えました。",points:[["入力","キーコンフィグ","操作とキーの対応を画面から変更します。"],["音","音量調整","カテゴリごとの値を設定UIへまとめます。"],["表示","画面モード切替","再起動せず表示方法を選べるようにします。"]],diagram:["設定UIで変更","値を保存","ゲーム各機能が参照"]},{title:"次の強化を数値で比較",intro:"段階式アップグレードでは、強化後の違いが分からないと選択の意味が薄れます。現在値と次段階を並べて、成長幅を見せるUIを作りました。",points:[["現在","今の性能を表示","比較の基準を明確にします。"],["次段階","変化量を表示","購入後の効果を事前に判断できます。"],["DrawList","簡易UIを描画","必要な表現をImGuiの描画機能で構成しました。"]],diagram:["現在値","変化量","次の値"]},{title:"エフェクトをゲーム内で作る",intro:"コードを変更して再ビルドする往復を減らすため、UnityのParticle Systemを参考に、粒子の発生・速度・色・寿命などを実行中に調整するツールを作りました。",points:[["調整","パラメーターを公開","粒子の見た目に関係する値をUIから操作します。"],["確認","その場で再生","変更直後の結果をゲーム画面で確認します。"],["反映","制作データとして利用","調整結果をゲーム内エフェクトへ反映します。"]],diagram:["値を変更","即時プレビュー","ゲームへ適用"]}]
  },
  buns: {
    kind:"Team / DirectX11",title:"Buns & Party",lead:"食材を集め、調理して注文へ納品するチーム制作。初期ゲームループと、シーン間連携・保存・調整基盤を担当しました。",summary:"企画2名・プログラマー5名・デザイナー2名で制作。チーム全員が触って仕様を話せるプロトタイプを早期に用意しました。",tools:["Visual Studio","C++","DirectX11","ImGui","JSON","GitHub","Fork"],role:"プロトタイプ、プレイヤー、食材キャッチ、納品、Transfer、セーブ／ロード、音連携、注文UI、調整用ImGuiを担当。",period:"2025/10–2026/01",github:null,
    gallery:[{image:"../image/powerpoint/buns%26party.png",alt:"ゲーム全体画面",caption:"料理から納品までのゲーム画面。"},{image:"../image/powerpoint/画像33.png",alt:"Transferの担当範囲",caption:"シーン間で受け渡す状態を整理。"},{image:"../image/powerpoint/buns%26party_imgui_tab.png",alt:"ImGui調整画面",caption:"値の確認・保存・再読込を行う調整UI。"},{image:"../image/powerpoint/buns%26party_order_new.png",alt:"改善後の注文UI",caption:"一覧性と確認導線を改善した注文UI。"},{image:"../image/powerpoint/buns%26party_sequence.png",alt:"保存フロー",caption:"Transferと保存・読込の流れ。"}],
    sections:[{title:"触って話せるゲームループを先に作る",intro:"仕様書だけで話すのではなく、移動、食材キャッチ、調理、納品までを早い段階でつなぎ、メンバーが同じ動きを見ながら相談できる状態を作りました。",points:[["Player","移動と操作","基本操作を先に成立させました。"],["Catch","食材を取得","見た目と判定のバランスを調整しました。"],["Delivery","注文へ納品","一連の遊びをプロトタイプで接続しました。"]],diagram:["食材を集める","料理を作る","注文へ納品"]},{title:"シーンをまたぐ状態をTransferへ集約",intro:"プレイヤー、カメラ、日付、UI、音の状態が各シーンで個別管理されると、遷移時の抜けや依存が増えます。受け渡すデータをTransferへ集約しました。",points:[["集約","受け渡し範囲を明示","どの状態を次シーンへ持ち越すか一覧化しました。"],["保存","JSONへ変換","CSVから構造化されたJSONへ移行し、項目追加と差分確認をしやすくしました。"],["復元","読込順を整理","Transferと保存データの責務をシーケンスで整理しました。"]],diagram:["Sceneの状態","Transferへ集約","次Scene・Saveへ渡す"]},{title:"実行中の調整をImGuiへ集める",intro:"値を変更するたびにコードを直すと、企画担当との調整速度が下がります。タブへ値を分類し、閲覧・変更・保存・再読込を一つの画面で行えるようにしました。",points:[["分類","タブで項目を整理","調整対象を目的別に分けます。"],["保存","変更値をデータ化","実行中の結果を次回起動へ残します。"],["共同制作","企画と改善","実際に使う担当者との打ち合わせで導線を修正しました。"]],diagram:["値を探す","実行中に変更","保存して共有"]},{title:"注文UIとチュートリアルを分けて整理",intro:"注文設定が分散していた旧UIを一覧中心へ変更し、設定漏れと確認の往復を減らしました。チュートリアルは通常進行から状態と表示責務を分けました。",points:[["注文UI","一覧性を優先","複数項目を同じ画面で確認できるようにしました。"],["チュートリアル","専用状態を用意","通常ゲームのアイテムや表示が残る問題を避けます。"],["データ","文言と条件を分離","進行条件と表示テキストを追いやすくしました。"]],diagram:["旧UIの問題を確認","一覧構成へ変更","実運用で再確認"]}]
  },
  namebattler: {
    kind:"Personal / Console",title:"ネームバトラー",lead:"入力した名前から能力値を生成し、行動速度を含む完全ターン制戦闘を行うコンソールゲーム。",summary:"C言語の文字列、構造体、入力制御、状態分岐を、一つのゲームとして組み合わせました。",tools:["C","Visual Studio","Console","Struct"],role:"個人制作。名前入力、能力値生成、ターン進行、行動順、勝敗判定を担当。",period:"2023/11–2023/12",github:null,
    gallery:[{diagram:["W/Sで文字を変更","A/Dで入力位置を移動","名前を確定"],caption:"キーボードだけで行う名前入力。"},{diagram:["名前から能力値を生成","Speedで行動順を決定","ターンごとに攻撃"],caption:"文字列から戦闘までの流れ。"}],
    sections:[{title:"コンソール上で名前を編集",intro:"方向キーまたはWASDで文字を変更し、入力位置を前後へ動かす名前入力を作りました。",points:[["上下","文字を変更","現在位置の文字候補を切り替えます。"],["左右","入力位置を移動","前後の文字へカーソルを動かします。"],["確定","文字列として保存","完成した名前を能力値生成へ渡します。"]],diagram:["入力を読む","カーソル・文字を更新","画面を再描画"]},{title:"構造体で戦闘データをまとめる",intro:"HP、攻撃力、行動速度などをキャラクター構造体へまとめ、共通の戦闘処理へ渡しました。",points:[["生成","名前から数値化","入力文字列を能力値へ変換します。"],["順番","Speedを比較","ターン内で先に行動するキャラクターを決めます。"],["戦闘","共通処理","対象のHPを更新し、勝敗まで繰り返します。"]],diagram:["Characterを生成","行動順を決定","攻撃・勝敗判定"]}]
  },
  tower: {
    kind:"Personal / Editor",title:"タワーディフェンス",lead:"3Dグリッド上でステージを作り、保存・読込できる配置Editorを主目的に制作したプロジェクト。",summary:"モデルの配置・変更・削除を画面上で行い、マップデータとしてゲームへ復元できるようにしました。",tools:["Visual Studio 2022","C++","DirectX11","ImGui","JSON","GitHub"],role:"個人制作。3Dグリッド配置Editor、モデル管理、マップ保存・読込を担当。",period:"2026/03–2026/06",github:"https://github.com/rain08080-0o0x/DX22_Project",
    gallery:[{image:"../image/castleEditor.png",alt:"3Dグリッド配置Editor",caption:"グリッド上へモデルを配置するEditor画面。"},{diagram:["モデルを選ぶ","グリッド座標へ配置","マップデータを保存"],caption:"ステージ制作の基本フロー。"}],
    sections:[{title:"配置をコードから画面操作へ移す",intro:"ステージ内の位置をコードへ直接書く方法では、位置関係の確認と修正に時間がかかります。3D画面でグリッドを選び、モデルを置くEditorを作りました。",points:[["選択","グリッドを特定","画面上の操作をセル座標へ変換します。"],["配置","モデルと座標を対応","選択したモデルをグリッドへ登録します。"],["編集","変更・削除","配置後も対象を選び直して修正できます。"]],diagram:["画面からセルを選択","モデルを配置","一覧と3D表示を更新"]},{title:"編集結果をゲームで復元",intro:"Editor上の見た目だけで終わらせず、配置対象と座標をデータへ保存し、読み込み時に同じステージを再構築します。",points:[["保存","配置情報を直列化","モデル識別子とグリッド座標を記録します。"],["読込","データから再生成","保存された要素を順にゲーム空間へ戻します。"],["効率化","配置と確認を往復","ImGuiから状態を見ながら修正できます。"]],diagram:["Editorの配置状態","マップファイル","ゲーム空間へ復元"]}]
  },
  lostpage: {
    kind:"Personal / Game design",title:"Lost Page",lead:"4色のエーテルを組み合わせてカードを発動し、分岐マップの最深部を目指すターン制デッキ構築ローグライト。",summary:"カードをデッキへ加える行為が、戦闘中に引くエーテルの色と総数まで変える設計です。WindowsとAndroidへ配布しています。",tools:["Unity 6","C#","GitHub","GitHub Releases","Windows","Android","Markdown"],role:"原案、企画、ゲームデザイン、仕様決定を担当。Unity実装、検証、配布支援にはCodex / OpenAIを利用。",period:"2026/07–2026/08",github:"https://github.com/rain08080-0o0x/LostPage",
    gallery:[{image:"../image/projects/lost-page/battle.png",alt:"Lost Pageの戦闘画面",caption:"カードと4色エーテルを使う戦闘画面。"},{image:"../image/projects/lost-page/card.png",alt:"カード詳細を展開した戦闘画面",caption:"カード詳細と使用可否を確認するUI。"},{image:"../image/projects/lost-page/map.png",alt:"分岐マップ",caption:"霧が迫る横方向の分岐マップ。"}],
    sections:[{title:"デッキが、引ける資源まで変える",intro:"デッキ内カードのエーテルコストを合計したものが、その戦闘で使う抽選プールになります。強いカードを増やすほど選択肢は広がりますが、必要色の確率とプール総数も変化します。",points:[["構築","カードを追加","効果だけでなく色コストもデッキへ加わります。"],["抽選","エーテルプール","デッキのコスト構成から毎ターンの資源を引きます。"],["判断","強さと安定性","高コストカードを増やす影響を戦闘前から考えます。"]],diagram:["カードの色コスト","エーテルプールを構成","毎ターン5個を抽選"]},{title:"使い切るか、次のターンへ残すか",intro:"通常は毎ターン5個を取得し、残ったエーテルを基本2個まで持ち越せます。現在の小さな行動と、次ターンの大技を比較する判断を作りました。",points:[["消費","カードコストを支払う","色の組み合わせを満たすカードを使用します。"],["持越","残す色を選ぶ","上限を超える場合は、次へ残すエーテルを選択します。"],["順番","効果をつなぐ","チャージ、弱体、貫通、クールダウンを使用順で組み合わせます。"]],diagram:["エーテルを引く","カードへ支払う","残りを選んで持ち越す"]},{title:"戻れるが、霧が追ってくる分岐マップ",intro:"戦闘、回復、ショップ、報酬、イベント、ボスを選んで進みます。同じ行の左右や通過済み経路へ戻れますが、移動ごとに下から霧が迫ります。",points:[["選択","複数の行き先","現在地と接続されたノードから次を選びます。"],["戻る","ショップ等を再利用","一本道にせず、経路を戻る選択を許可します。"],["制約","霧によるHP減少","安全な往復を無制限にせず、移動回数へコストを持たせます。"]],diagram:["経路を選ぶ","移動ごとに霧が上昇","最深部のボスを目指す"]}]
  }
};

const key = document.body.dataset.project;
const data = projectData[key];

if (!data) {
  document.querySelector("main").innerHTML = '<section class="project-hero shell"><h1>Project not found</h1><p><a href="../index.html">トップへ戻る</a></p></section>';
} else {
  document.title = `${data.title} — Ikuya Yamamoto Portfolio`;
  const hero = document.querySelector("#project-hero");
  hero.innerHTML = `<p class="eyebrow">${data.kind}</p><h1>${data.title}</h1><p class="project-lead">${data.lead}</p><div class="project-actions">${data.github ? `<a class="button primary" href="${data.github}" target="_blank" rel="noreferrer">GitHubで見る ↗</a>` : ""}<a class="button secondary" href="#details">制作内容を見る</a></div>`;

  const gallery = document.querySelector("#gallery");
  const slideHtml = data.gallery.map((item, index) => {
    const content = item.image
      ? `<img src="${item.image}" alt="${item.alt}" loading="${index === 0 ? "eager" : "lazy"}">`
      : `<div class="process-diagram">${item.diagram.map((step, stepIndex) => `<div><span>0${stepIndex + 1}</span><strong>${step}</strong></div>`).join("")}</div>`;
    return `<div class="gallery-slide${index === 0 ? " active" : ""}${item.diagram ? " diagram-slide" : ""}" data-slide="${index}">${content}<p class="gallery-caption">${item.caption}</p></div>`;
  }).join("");
  const thumbs = data.gallery.map((item, index) => `<button class="gallery-thumb${index === 0 ? " active" : ""}" type="button" data-target="${index}" aria-label="${index + 1}枚目を表示">${item.image ? `<img src="${item.image}" alt="">` : `<span>FIG. ${String(index + 1).padStart(2,"0")}</span>`}</button>`).join("");
  gallery.innerHTML = `<div class="gallery-stage" tabindex="0" aria-label="作品ギャラリー。左右キーで画像を切り替えられます">${slideHtml}${data.gallery.length > 1 ? '<button class="gallery-button prev" type="button" aria-label="前の画像">←</button><button class="gallery-button next" type="button" aria-label="次の画像">→</button>' : ""}</div><div class="gallery-strip" aria-label="ギャラリーのサムネイル">${thumbs}</div><p class="gallery-counter" aria-live="polite"><span>1</span> / ${data.gallery.length}</p>`;

  document.querySelector("#summary").innerHTML = `<dl class="meta-list"><div><dt>概要</dt><dd>${data.summary}</dd></div><div><dt>使用したツール・言語</dt><dd><ul class="meta-tags">${data.tools.map(tool => `<li>${tool}</li>`).join("")}</ul></dd></div><div><dt>担当範囲</dt><dd>${data.role}</dd></div><div><dt>期間</dt><dd>${data.period}</dd></div></dl>`;

  const toc = document.querySelector("#toc-list");
  toc.innerHTML = data.sections.map((section, index) => `<li><a href="#case-${index + 1}">${section.title}</a></li>`).join("");
  document.querySelector("#case-studies").innerHTML = data.sections.map((section, index) => {
    const points = section.points.map(point => {
      const pointTitle = point[1].replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return `<article><span>${point[0]}</span><h3>${pointTitle}</h3><p>${point[2]}</p></article>`;
    }).join("");
    const diagram = section.diagram ? `<div class="process-diagram">${section.diagram.map((step, stepIndex) => `<div><span>0${stepIndex + 1}</span><strong>${step}</strong></div>`).join("")}</div>` : "";
    return `<section id="case-${index + 1}" class="case-study"><p class="case-number">CASE ${String(index + 1).padStart(2,"0")}</p><h2>${section.title}</h2><p class="case-intro">${section.intro}</p>${diagram}<div class="case-grid">${points}</div></section>`;
  }).join("");
}

const slides = [...document.querySelectorAll(".gallery-slide")];
const thumbs = [...document.querySelectorAll(".gallery-thumb")];
let currentSlide = 0;

function showSlide(index) {
  if (!slides.length) return;
  currentSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle("active", slideIndex === currentSlide));
  thumbs.forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("active", thumbIndex === currentSlide);
    thumb.setAttribute("aria-current", thumbIndex === currentSlide ? "true" : "false");
  });
  const counter = document.querySelector(".gallery-counter span");
  if (counter) counter.textContent = String(currentSlide + 1);
  thumbs[currentSlide]?.scrollIntoView({block:"nearest",inline:"nearest"});
}

document.querySelector(".gallery-button.prev")?.addEventListener("click", () => showSlide(currentSlide - 1));
document.querySelector(".gallery-button.next")?.addEventListener("click", () => showSlide(currentSlide + 1));
thumbs.forEach(thumb => thumb.addEventListener("click", () => showSlide(Number(thumb.dataset.target))));
document.querySelector(".gallery-stage")?.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") showSlide(currentSlide - 1);
  if (event.key === "ArrowRight") showSlide(currentSlide + 1);
});
